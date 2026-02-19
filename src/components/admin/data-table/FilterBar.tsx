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
            <span className="text-sm text-gray-600">{field.label}</span>
            <input
                type="date"
                value={values[fromKey] || ''}
                onChange={(event) => onChange(fromKey, event.target.value)}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
            />
            <span className="text-sm text-gray-500">to</span>
            <input
                type="date"
                value={values[toKey] || ''}
                onChange={(event) => onChange(toKey, event.target.value)}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
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
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4">
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
                            <span className="text-sm text-gray-600">{field.label}</span>
                            <select
                                value={values[field.key] || ''}
                                onChange={(event) => onChange(field.key, event.target.value)}
                                className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                            >
                                <option value="">All</option>
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
                <Button type="button" size="sm" variant="outline" onClick={onClear}>
                    <FilterX className="h-4 w-4" />
                    Clear filters
                </Button>
            </div>
        </div>
    );
}

