import type { DefaultSession } from 'next-auth';
import type { AdminRole } from '@/lib/auth/roles';

declare module 'next-auth' {
    interface Session {
        user: DefaultSession['user'] & {
            role?: AdminRole;
        };
    }

    interface User {
        role?: AdminRole;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        role?: AdminRole;
    }
}
