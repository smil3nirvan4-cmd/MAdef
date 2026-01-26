import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string | number;
    icon?: LucideIcon;
    trend?: {
        value: number;
        label: string;
        direction: 'up' | 'down';
    };
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
    className?: string;
}

const colorStyles = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
};

export function StatCard({ label, value, icon: Icon, trend, color = 'blue', className }: StatCardProps) {
    return (
        <Card className={cn('hover:shadow-md transition-shadow', className)}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{label}</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>

                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 mt-2 text-xs font-medium",
                            trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                        )}>
                            <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
                            <span>{trend.value}%</span>
                            <span className="text-gray-400 font-normal ml-1">{trend.label}</span>
                        </div>
                    )}
                </div>

                {Icon && (
                    <div className={cn("p-3 rounded-xl", colorStyles[color])}>
                        <Icon className="w-6 h-6" />
                    </div>
                )}
            </div>
        </Card>
    );
}
