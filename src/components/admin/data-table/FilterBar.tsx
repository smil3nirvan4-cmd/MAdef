'use client';

import { FilterX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export interface FilterField {
    key: string;
    label: string;
    type: 'text' | 'select' | 'date-range';
    options?: { label: string; value: string }[];
    placeholder?: string;
}

interface FilterBarProps {
    fields: FilterField[];
    values: Record<string, string>;
    onChange: (key: string, value: string) => void;
    onClear: () => void;
}

function DateRangeField({
    field,
    values,
    onChange,
}: {
    field: FilterField;
    values: Record<string, string>;
    onChange: (key: string, value: string) => void;
}) {
    const fromKey = `${field.key}From`;
    const toKey = `${field.key}To`;

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{field.label}</span>
            <input
                type="date"
                value={values[fromKey] || ''}
                onChange={(event) => onChange(fromKey, event.target.value)}
                className="h-10 rounded-md border border-border bg-card hover:border-primary/30 hover:bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all cursor-pointer"
            />
            <span className="text-sm text-muted-foreground">até</span>
            <input
                type="date"
                value={values[toKey] || ''}
                onChange={(event) => onChange(toKey, event.target.value)}
                className="h-10 rounded-md border border-border bg-card hover:border-primary/30 hover:bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all cursor-pointer"
            />
        </div>
    );
}

export function FilterBar({
    fields,
    values,
    onChange,
    onClear,
}: FilterBarProps) {
    return (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
            {fields.map((field) => {
                if (field.type === 'text') {
                    return (
                        <div key={field.key} className="min-w-[220px]">
                            <Input
                                value={values[field.key] || ''}
                                onChange={(event) => onChange(field.key, event.target.value)}
                                placeholder={field.placeholder || field.label}
                            />
                        </div>
                    );
                }

                if (field.type === 'select') {
                    return (
                        <div key={field.key} className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{field.label}</span>
                            <select
                                value={values[field.key] || ''}
                                onChange={(event) => onChange(field.key, event.target.value)}
                                className="h-10 rounded-md border border-border bg-card hover:border-primary/30 hover:bg-background px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%209L12%2015L18%209%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[position:right_12px_center] bg-no-repeat cursor-pointer"
                            >
                                <option value="">Todos</option>
                                {(field.options || []).map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    );
                }

                return (
                    <DateRangeField
                        key={field.key}
                        field={field}
                        values={values}
                        onChange={onChange}
                    />
                );
            })}

            <div className="ml-auto">
                <Button type="button" size="md" variant="outline" onClick={onClear} className="h-10 border-border hover:bg-background text-foreground active:scale-[0.98] transition-all">
                    <FilterX className="h-4 w-4" />
                    Limpar filtros
                </Button>
            </div>
        </div>
    );
}
