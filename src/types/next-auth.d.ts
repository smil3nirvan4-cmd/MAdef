import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: DefaultSession['user'] & {
            role?: 'ADMIN' | 'OPERADOR' | 'LEITURA';
        };
    }

    interface User {
        role?: 'ADMIN' | 'OPERADOR' | 'LEITURA';
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        role?: 'ADMIN' | 'OPERADOR' | 'LEITURA';
    }
}

