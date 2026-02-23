import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { resolveUserRole, type AdminRole } from '@/lib/auth/roles';
import logger from '@/lib/observability/logger';

function timingSafeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) {
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
                    const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

                    if (!ADMIN_EMAIL || (!ADMIN_PASSWORD && !ADMIN_PASSWORD_HASH)) {
                        await logger.error(
                            'auth_config_missing',
                            'ADMIN_EMAIL and ADMIN_PASSWORD or ADMIN_PASSWORD_HASH must be configured',
                        ).catch(() => {});
                        return null;
                    }

                    const emailMatch = timingSafeCompare(email, ADMIN_EMAIL);
                    if (!emailMatch) return null;

                    let passwordMatch = false;

                    if (ADMIN_PASSWORD_HASH) {
                        // Preferred: bcrypt hash comparison
                        passwordMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
                    } else if (ADMIN_PASSWORD) {
                        // Legacy fallback: plaintext comparison (deprecated)
                        passwordMatch = timingSafeCompare(password, ADMIN_PASSWORD);
                        if (passwordMatch) {
                            await logger.warning(
                                'auth_plaintext_password',
                                'Using plaintext ADMIN_PASSWORD is deprecated. Generate a hash with: npx bcryptjs <password> and set ADMIN_PASSWORD_HASH instead.',
                            ).catch(() => {});
                        }
                    }

                    if (passwordMatch) {
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
