import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent' | 'success';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

const variantStyles = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-900 focus:ring-ring shadow-sm border border-transparent',
    accent: 'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 focus:ring-accent-400 shadow-sm border border-transparent',
    secondary: 'bg-card text-foreground border border-border hover:bg-surface-subtle active:bg-neutral-200 focus:ring-ring shadow-sm',
    outline: 'border border-border bg-transparent hover:bg-primary/5 hover:text-primary active:bg-primary/10 text-foreground focus:ring-ring',
    ghost: 'bg-transparent text-foreground hover:bg-surface-subtle hover:text-foreground active:bg-neutral-200 focus:ring-ring',
    danger: 'bg-error-600 text-white hover:bg-error-700 active:bg-error-800 focus:ring-error-500 shadow-sm border border-transparent',
    success: 'bg-success-600 text-white hover:bg-success-700 active:bg-success-800 focus:ring-success-500 shadow-sm border border-transparent',
};

const sizeStyles = {
    sm: 'h-8 px-3 text-xs gap-1.5 min-w-[2rem]',
    md: 'h-9 px-4 text-sm gap-2 min-w-[2.5rem]',
    lg: 'h-11 px-6 text-base gap-2 min-w-[3rem]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    'inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    'disabled:opacity-55 disabled:cursor-not-allowed disabled:pointer-events-none',
                    variantStyles[variant],
                    sizeStyles[size],
                    className
                )}
                {...props}
            >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
