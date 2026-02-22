'use client';

import { InputHTMLAttributes, forwardRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface MaskedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    label?: string;
    error?: string;
    hint?: string;
    mask?: (value: string) => string;
    onValueChange?: (raw: string, masked: string) => void;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    suffix?: string;
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
    ({ className, label, error, hint, mask, onValueChange, onChange, suffix, id, ...props }, ref) => {
        const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

        const handleChange = useCallback(
            (e: React.ChangeEvent<HTMLInputElement>) => {
                if (mask) {
                    const raw = e.target.value;
                    const masked = mask(raw);
                    // Update the input value to the masked version
                    e.target.value = masked;
                    onValueChange?.(raw.replace(/\D/g, ''), masked);
                }
                onChange?.(e);
            },
            [mask, onValueChange, onChange]
        );

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
                    <p className="text-xs text-muted-foreground mb-1">{hint}</p>
                )}
                <div className="relative">
                    <input
                        ref={ref}
                        id={inputId}
                        aria-invalid={error ? true : undefined}
                        className={cn(
                            'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150',
                            error && 'border-error-500 focus:ring-error-500',
                            suffix && 'pr-12',
                            className
                        )}
                        onChange={handleChange}
                        {...props}
                    />
                    {suffix && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                            {suffix}
                        </span>
                    )}
                </div>
                {error && (
                    <p className="mt-1 text-xs text-error-600" role="alert">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

MaskedInput.displayName = 'MaskedInput';
