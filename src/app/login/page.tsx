'use client';

import { useActionState } from 'react';
import { authenticate } from '@/lib/actions';
import { Heart, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [errorMessage, formAction, isPending] = useActionState(
        authenticate,
        undefined
    );

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-500 p-4">
            {/* Glass card */}
            <div className="w-full max-w-sm rounded-2xl bg-card/95 backdrop-blur-sm p-8 shadow-xl">
                {/* Brand */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
                        <Heart className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Mãos Amigas</h1>
                    <p className="text-sm text-muted-foreground mt-1">Acesso Administrativo</p>
                </div>

                <form action={formAction} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="email">
                            Email
                        </label>
                        <input
                            className="block w-full rounded-md border border-border-hover bg-card px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                            id="email"
                            type="email"
                            name="email"
                            placeholder="seu@email.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="password">
                            Senha
                        </label>
                        <input
                            className="block w-full rounded-md border border-border-hover bg-card px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                            id="password"
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <div
                        className="flex h-8 items-end space-x-1"
                        aria-live="polite"
                        aria-atomic="true"
                    >
                        {errorMessage && (
                            <p className="text-sm text-error-600 font-medium">{errorMessage}</p>
                        )}
                    </div>

                    <button
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-semibold text-white bg-primary hover:bg-primary active:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring shadow-sm disabled:opacity-50 transition-all duration-150"
                        aria-disabled={isPending}
                        disabled={isPending}
                    >
                        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Entrar
                    </button>
                </form>

                <p className="mt-6 text-center text-xs text-muted-foreground">
                    © {new Date().getFullYear()} Mãos Amigas — Cuidadores e Home Care
                </p>
            </div>
        </div>
    );
}
