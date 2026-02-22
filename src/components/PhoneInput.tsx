'use client';

import { useState, useEffect, useCallback } from 'react';
import { validateBrazilianPhone, autoCorrectBrazilianPhone, type PhoneValidationResult } from '@/lib/phone-validator';

interface PhoneInputProps {
    value: string;
    onChange: (value: string, validation: PhoneValidationResult) => void;
    label?: string;
    required?: boolean;
    placeholder?: string;
    className?: string;
    showValidation?: boolean;
}

export default function PhoneInput({
    value,
    onChange,
    label = 'Telefone',
    required = false,
    placeholder = '(45) 99999-9999',
    className = '',
    showValidation = true,
}: PhoneInputProps) {
    const [displayValue, setDisplayValue] = useState('');
    const [validation, setValidation] = useState<PhoneValidationResult | null>(null);
    const [touched, setTouched] = useState(false);
    const [corrected, setCorrected] = useState(false);

    const formatForDisplay = useCallback((input: string): string => {
        let digits = input.replace(/\D/g, '');
        if (digits.startsWith('55') && digits.length > 11) {
            digits = digits.slice(2);
        }

        if (digits.length === 0) return '';
        if (digits.length <= 2) return `(${digits}`;
        if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        if (digits.length <= 10) {
            return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
        }
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }, []);

    useEffect(() => {
        if (value) {
            setDisplayValue(formatForDisplay(value));
            setValidation(validateBrazilianPhone(value));
        }
    }, [value, formatForDisplay]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        const digits = input.replace(/\D/g, '').slice(0, 11);

        setDisplayValue(formatForDisplay(digits));
        setCorrected(false);

        const result = validateBrazilianPhone(digits);
        setValidation(result);
        onChange(digits, result);
    };

    const handleBlur = () => {
        setTouched(true);

        // Auto-correct truncated mobile numbers on blur
        const digits = (displayValue || '').replace(/\D/g, '');
        if (digits.length >= 10) {
            const correction = autoCorrectBrazilianPhone(digits);
            if (correction.wasCorrected) {
                const correctedDigits = correction.corrected;
                setDisplayValue(formatForDisplay(correctedDigits));
                setCorrected(true);

                const result = validateBrazilianPhone(correctedDigits);
                setValidation(result);
                onChange(correctedDigits, result);
            }
        }
    };

    const showError = showValidation && touched && validation && !validation.isValid;
    const showSuccess = showValidation && touched && validation?.isValid;

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {label && (
                <label className="text-sm font-medium text-foreground">
                    {label}{required && <span className="text-error-500 ml-1">*</span>}
                </label>
            )}

            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">+55</span>
                <input
                    type="tel"
                    value={displayValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    required={required}
                    className={`w-full pl-12 pr-10 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:outline-none transition-all bg-background
            ${showError ? 'border-error-500 bg-error-50' : 'border-border-hover'}
            ${showSuccess ? 'border-secondary-500 bg-success-50' : ''}`}
                />
                {showValidation && touched && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold ${validation?.isValid ? 'text-success-600' : 'text-error-500'}`}>
                        {validation?.isValid ? '✓' : '✗'}
                    </span>
                )}
            </div>

            {corrected && showSuccess && (
                <p className="text-xs text-info-600">Nono digito adicionado automaticamente</p>
            )}

            {showError && validation?.error && (
                <p className="text-sm text-error-600">{validation.error}</p>
            )}

            {showSuccess && validation?.type !== 'celular' && (
                <p className="text-sm text-warning-600">WhatsApp requer celular</p>
            )}
        </div>
    );
}
