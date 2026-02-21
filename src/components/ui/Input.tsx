import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    icon?: LucideIcon;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, hint, icon: Icon, id, ...props }, ref) => {
        const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
        const hintId = hint && inputId ? `${inputId}-hint` : undefined;
        const errorId = error && inputId ? `${inputId}-error` : undefined;

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-foreground mb-1.5"
                    >
                        {label}
                    </label>
                )}
                {hint && (
                    <p id={hintId} className="text-xs text-muted-foreground mb-1">
                        {hint}
                    </p>
                )}
                <div className="relative">
                    {Icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            <Icon className="w-5 h-5" />
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
                        aria-invalid={error ? true : undefined}
                        className={cn(
                            'flex h-9 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary-300 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150 hover:border-border-hover',
                            Icon && 'pl-10',
                            error && 'border-error-500 focus:ring-error-500',
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && (
                    <p id={errorId} className="mt-1 text-xs text-error-600" role="alert">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
