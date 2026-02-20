import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface Breadcrumb {
    label: string;
    href?: string;
}

interface PageHeaderProps {
    title: string;
    description?: string;
    breadcrumbs?: Breadcrumb[];
    actions?: React.ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    description,
    breadcrumbs,
    actions,
    className,
}: PageHeaderProps) {
    return (
        <div className={cn('mb-8', className)}>
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
                    {breadcrumbs.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                            {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
                            {item.href ? (
                                <Link href={item.href} className="hover:text-primary transition-colors duration-150">
                                    {item.label}
                                </Link>
                            ) : (
                                <span className="font-medium text-foreground">{item.label}</span>
                            )}
                        </div>
                    ))}
                </nav>
            )}

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
                    {description && (
                        <p className="mt-1 text-muted-foreground">{description}</p>
                    )}
                </div>
                {actions && <div className="flex items-center gap-3">{actions}</div>}
            </div>
        </div>
    );
}
