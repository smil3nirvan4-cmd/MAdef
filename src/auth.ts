import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

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

                    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
                        return {
                            id: '1',
                            name: 'Admin',
                            email: ADMIN_EMAIL,
                        };
                    }
                }

                return null;
            },
        }),
    ],
});
