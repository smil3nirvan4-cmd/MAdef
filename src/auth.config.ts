import type { NextAuthConfig } from 'next-auth';
import {
    canAccessAdminApi,
    canAccessAdminPage,
    canAccessWhatsAppApi,
    isPublicWhatsAppRoute,
    resolveUserRole,
} from '@/lib/auth/roles';

export const authConfig = {
    trustHost: true,
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
            const isOnWhatsAppApi = pathname.startsWith('/api/whatsapp');

            if (isOnAdminPage || isOnAdminApi || isOnWhatsAppApi) {
                if (isOnWhatsAppApi && isPublicWhatsAppRoute(pathname, request.method)) {
                    return true;
                }

                if (!isLoggedIn) {
                    return false;
                }

                const role = resolveUserRole(auth?.user?.email);

                if (isOnWhatsAppApi) {
                    return canAccessWhatsAppApi(role, request.method, pathname);
                }

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
