import crypto from 'crypto';
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { resolveUserRole, type AdminRole } from '@/lib/auth/roles';

function timingSafeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) {
        // Compare against self to avoid timing leaks on length mismatch
        crypto.timingSafeEqual(bufA, bufA);
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;

                    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
                    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

                    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
                        console.error('ADMIN_EMAIL e ADMIN_PASSWORD devem ser configurados nas variáveis de ambiente');
                        return null;
                    }

                    const emailMatch = timingSafeCompare(email, ADMIN_EMAIL);
                    const passwordMatch = timingSafeCompare(password, ADMIN_PASSWORD);

                    if (emailMatch && passwordMatch) {
                        const role = resolveUserRole(email);
                        return {
                            id: '1',
                            name: 'Admin',
                            email: ADMIN_EMAIL,
                            role,
                        };
                    }
                }

                return null;
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user }) {
            if (user?.email) {
                token.role = resolveUserRole(user.email);
            } else if (!token.role) {
                token.role = resolveUserRole(token.email || null);
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = (token.role as AdminRole) || resolveUserRole(session.user.email || null);
            }
            return session;
        },
    },
});
