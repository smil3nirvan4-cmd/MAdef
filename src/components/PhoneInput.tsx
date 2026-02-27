'use client';

import { useState, useEffect, useCallback } from 'react';
import { validateBrazilianPhone, type PhoneValidationResult } from '@/lib/phone-validator';

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
    placeholder = '(11) 99999-9999',
    className = '',
    showValidation = true,
}: PhoneInputProps) {
    const [displayValue, setDisplayValue] = useState('');
    const [validation, setValidation] = useState<PhoneValidationResult | null>(null);
    const [touched, setTouched] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [phoneCorrected, setPhoneCorrected] = useState(false);

    const formatForDisplay = useCallback((input: string): string => {
        const digits = input.replace(/\D/g, '');
        let clean = digits;
        if (clean.startsWith('55') && clean.length > 11) {
            clean = clean.slice(2);
        }

        if (clean.length === 0) return '';
        if (clean.length <= 2) return `(${clean}`;
        if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
        if (clean.length <= 10) {
            return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
        }
        return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
    }, []);

    // Sync display from external value changes (only when not focused)
    useEffect(() => {
        if (value && !isFocused) {
            const result = validateBrazilianPhone(value);
            setValidation(result);
            if (result.corrected && result.number && result.ddd) {
                setDisplayValue(`(${result.ddd}) ${result.number.slice(0, 5)}-${result.number.slice(5)}`);
                setPhoneCorrected(true);
            } else {
                setDisplayValue(formatForDisplay(value));
                setPhoneCorrected(false);
            }
        }
    }, [value, formatForDisplay, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        const digits = input.replace(/\D/g, '').slice(0, 11);

        // During typing: validate but do NOT apply auto-correction to display
        const result = validateBrazilianPhone(digits);
        setValidation(result);
        setPhoneCorrected(false);

        // Always show what user actually typed
        setDisplayValue(formatForDisplay(digits));

        // Always propagate RAW digits (no correction) during typing
        onChange(digits, result);
    };

    const handleBlur = () => {
        setIsFocused(false);
        setTouched(true);

        // Now apply auto-correction on blur
        const digits = displayValue.replace(/\D/g, '');
        const result = validateBrazilianPhone(digits);
        setValidation(result);

        if (result.corrected && result.ddd && result.number) {
            const correctedDigits = `${result.ddd}${result.number}`;
            setDisplayValue(`(${result.ddd}) ${result.number.slice(0, 5)}-${result.number.slice(5)}`);
            setPhoneCorrected(true);
            onChange(correctedDigits, result);
        } else {
            setPhoneCorrected(false);
        }
    };

    const showError = showValidation && touched && validation && !validation.isValid;
    const showSuccess = showValidation && touched && validation?.isValid;
    const showCorrected = showValidation && touched && phoneCorrected;

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {label && (
                <label className="text-sm font-medium text-foreground">
                    {label}{required && <span className="text-error-500 ml-1">*</span>}
                </label>
            )}

            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base leading-none">+55</span>
                <input
                    type="tel"
                    value={displayValue}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    required={required}
                    className={`w-full pl-12 pr-10 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all
            ${showError ? 'border-error-500 bg-error-50' : 'border-border-hover'}
            ${showSuccess ? 'border-success-500 bg-success-50' : ''}`}
                />
                {showValidation && touched && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold ${validation?.isValid ? 'text-success-600' : 'text-error-500'}`}>
                        {validation?.isValid ? '\u2713' : '\u2717'}
                    </span>
                )}
            </div>

            {showError && validation?.error && (
                <p className="text-xs text-error-600">{validation.error}</p>
            )}

            {showCorrected && (
                <p className="text-xs text-primary">
                    Digito 9 adicionado automaticamente (celular BR)
                </p>
            )}

            {showSuccess && !showCorrected && validation?.type !== 'celular' && (
                <p className="text-xs text-warning-600">WhatsApp requer celular</p>
            )}
        </div>
    );
}
