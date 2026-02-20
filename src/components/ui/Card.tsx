import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    noPadding?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, noPadding = false, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'bg-card text-card-foreground rounded-xl border border-border shadow-sm overflow-hidden',
                    className
                )}
                {...props}
            >
                <div className={cn(!noPadding && 'p-6')}>{children}</div>
            </div>
        );
    }
);

Card.displayName = 'Card';
