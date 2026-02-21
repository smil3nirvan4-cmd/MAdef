'use client';

import { useActionState } from 'react';
import { authenticate } from '@/lib/actions';
import { Heart, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const [errorMessage, formAction, isPending] = useActionState(
        authenticate,
        undefined
    );

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-navy-900 p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary-500/10 rounded-full blur-3xl" />

            {/* Glass card */}
            <div className="relative w-full max-w-sm rounded-2xl bg-card/95 backdrop-blur-md p-8 shadow-xl border border-border/50">
                {/* Brand */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-900/30">
                        <Heart className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Maos Amigas</h1>
                    <p className="text-sm text-muted-foreground mt-1">Acesso Administrativo</p>
                </div>

                <form action={formAction} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="email">
                            Email
                        </label>
                        <input
                            className="block w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-ring transition-all hover:border-border-hover"
                            id="email"
                            type="email"
                            name="email"
                            placeholder="seu@email.com"
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="password">
                            Senha
                        </label>
                        <input
                            className="block w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-ring transition-all hover:border-border-hover"
                            id="password"
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            required
                            minLength={6}
                            autoComplete="current-password"
                        />
                    </div>

                    <div
                        className="min-h-[2rem] flex items-center"
                        aria-live="polite"
                        aria-atomic="true"
                    >
                        {errorMessage && (
                            <div className="flex items-center gap-2 text-sm text-error-600 font-medium">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}
                    </div>

                    <button
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary-hover active:bg-primary-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-ring shadow-sm hover:shadow-md disabled:opacity-50 disabled:pointer-events-none transition-all duration-150"
                        aria-disabled={isPending}
                        disabled={isPending}
                    >
                        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Entrar
                    </button>
                </form>

                <p className="mt-8 text-center text-xs text-muted-foreground">
                    &copy; {new Date().getFullYear()} Maos Amigas — Cuidadores e Home Care
                </p>
            </div>
        </div>
    );
}
