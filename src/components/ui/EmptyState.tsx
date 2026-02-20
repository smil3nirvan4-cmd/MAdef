import { cn } from '@/lib/utils';
import { LucideIcon, FileSearch } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
    icon?: LucideIcon;
    title?: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export function EmptyState({
    icon: Icon = FileSearch,
    title = 'Nenhum resultado encontrado',
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center py-12 px-6 text-center',
                className
            )}
        >
            <div className="rounded-full bg-surface-subtle p-4 mb-4">
                <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
            )}
            {action && (
                <Button variant="outline" size="sm" onClick={action.onClick} className="mt-4">
                    {action.label}
                </Button>
            )}
        </div>
    );
}
