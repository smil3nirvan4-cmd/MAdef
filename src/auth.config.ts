import type { NextAuthConfig } from 'next-auth';
import { canAccessAdminApi, canAccessAdminPage, resolveUserRole } from '@/lib/auth/roles';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    providers: [],
    callbacks: {
        authorized({ auth, request }) {
            const isLoggedIn = !!auth?.user;
            const pathname = request.nextUrl.pathname;
            const isOnAdminPage = pathname.startsWith('/admin');
            const isOnAdminApi = pathname.startsWith('/api/admin');

            if (isOnAdminPage || isOnAdminApi) {
                if (!isLoggedIn) {
                    return false;
                }

                const role = resolveUserRole(auth?.user?.email);
                if (isOnAdminApi) {
                    return canAccessAdminApi(role, request.method, pathname);
                }

                if (isOnAdminPage) {
                    return canAccessAdminPage(role, pathname);
                }

                return false; // Redirect unauthenticated users to login page
            }
            return true;
        },
    },
} satisfies NextAuthConfig;
