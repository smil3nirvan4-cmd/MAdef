'use client';

import { useEffect } from 'react';

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Admin error boundary:', error);
    }, [error]);

    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-8">
            <div className="mx-auto max-w-md text-center">
                <div className="mb-4 text-4xl">⚠</div>
                <h2 className="mb-2 text-xl font-semibold text-foreground">
                    Algo deu errado
                </h2>
                <p className="mb-6 text-sm text-muted-foreground">
                    Ocorreu um erro inesperado ao carregar esta página.
                    {error.digest && (
                        <span className="mt-1 block text-xs text-muted-foreground/70">
                            Ref: {error.digest}
                        </span>
                    )}
                </p>
                <button
                    onClick={reset}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    Tentar novamente
                </button>
            </div>
        </div>
    );
}
