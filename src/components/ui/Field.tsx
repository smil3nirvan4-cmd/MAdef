import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface FieldProps {
    label?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    children: ReactNode;
    className?: string;
    htmlFor?: string;
}

export function Field({
    label,
    hint,
    error,
    required = false,
    children,
    className,
    htmlFor,
}: FieldProps) {
    return (
        <div className={cn('w-full', className)}>
            {label && (
                <label
                    htmlFor={htmlFor}
                    className="block text-sm font-medium text-foreground mb-1.5"
                >
                    {label}
                    {required && <span className="text-error-500 ml-0.5">*</span>}
                </label>
            )}
            {hint && (
                <p className="text-xs text-muted-foreground mb-1">{hint}</p>
            )}
            {children}
            {error && (
                <p className="mt-1 text-xs text-error-600" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
