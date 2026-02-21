import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
    lines?: number;
}

export function Skeleton({ className, lines = 1 }: SkeletonProps) {
    if (lines > 1) {
        return (
            <div className="space-y-2">
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            'h-4 rounded-md bg-neutral-200/80 animate-pulse',
                            i === lines - 1 && 'w-3/4',
                            className
                        )}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={cn(
                'h-4 rounded-md bg-neutral-200/80 animate-pulse',
                className
            )}
        />
    );
}

interface TableSkeletonProps {
    columns: number;
    rows?: number;
}

export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
    return (
        <>
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <tr key={rowIdx} className="animate-pulse">
                    {Array.from({ length: columns }).map((_, colIdx) => (
                        <td key={colIdx} className="px-3 py-3">
                            <div className="h-4 rounded-sm bg-neutral-200" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}
