import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface SectionCardProps {
    title?: string;
    description?: string;
    toolbar?: ReactNode;
    children: ReactNode;
    className?: string;
    noPadding?: boolean;
}

export function SectionCard({
    title,
    description,
    toolbar,
    children,
    className,
    noPadding = false,
}: SectionCardProps) {
    return (
        <div
            className={cn(
                'bg-card text-card-foreground rounded-xl border border-border shadow-sm overflow-hidden',
                className
            )}
        >
            {(title || toolbar) && (
                <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
                    <div>
                        {title && (
                            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                        )}
                        {description && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                        )}
                    </div>
                    {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
                </div>
            )}
            <div className={cn(!noPadding && 'p-6')}>{children}</div>
        </div>
    );
}
