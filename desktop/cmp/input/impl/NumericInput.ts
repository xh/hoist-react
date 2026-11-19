/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import type {
    ChangeEvent,
    CSSProperties,
    FC,
    KeyboardEvent,
    ReactElement,
    ReactNode,
    Ref
} from 'react';
import {createElement as h, useId, useRef} from 'react';
import {InputGroup} from './InputGroup';

export interface NumericInputProps {
    /** The value shown, as text. */
    value: string;

    /** Called with the parsed number and the text whenever the user edits or steps the value. */
    onValueChange: (value: number, valueAsString: string) => void;

    /** True to block typing or pasting characters that cannot appear in a number. */
    allowNumericCharactersOnly?: boolean;

    /** Locale whose digits and separators the value uses - e.g. 'en-US' for comma grouping. */
    locale?: string;

    /** Step for the arrow keys. Default 1. Null to disable. */
    stepSize?: number;

    /** Step for Shift + arrow keys. Default 10. Null to disable. */
    majorStepSize?: number;

    /** Step for Alt + arrow keys. Null to disable. */
    minorStepSize?: number;

    className?: string;
    style?: CSSProperties;
    disabled?: boolean;
    readOnly?: boolean;
    inputRef?: Ref<HTMLInputElement>;
    leftIcon?: ReactElement;
    rightElement?: ReactNode;
    onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
    [attr: string]: any;
}

/**
 * A text input for numbers, stepped by the arrow keys. Ports the parts of Blueprint's
 * `NumericInput` that Hoist's `NumberInput` uses - it shows no stepper buttons and applies no
 * min or max, which `NumberInput` checks itself. Renders the same elements and class names.
 * @internal
 */
export const NumericInput: FC<NumericInputProps> = props => {
    const {
            allowNumericCharactersOnly = true,
            className,
            locale,
            majorStepSize: majorProp,
            minorStepSize,
            onKeyDown,
            onValueChange,
            stepSize: stepProp,
            value,
            ...rest
        } = props,
        stepSize = stepProp === undefined ? 1 : stepProp,
        majorStepSize = majorProp === undefined ? 10 : majorProp,
        id = useId(),
        pasted = useRef(false);

    const emit = (text: string) => onValueChange(Number(toStringNumber(text, locale)), text);

    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
        let text = e.target.value;
        if (allowNumericCharactersOnly && pasted.current) text = sanitize(text, locale);
        pasted.current = false;
        emit(text);
    };

    const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (!props.disabled && !props.readOnly) {
            const direction = e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : 0;
            if (direction) {
                e.preventDefault();
                const step =
                    e.shiftKey && majorStepSize != null
                        ? majorStepSize
                        : e.altKey && minorStepSize != null
                          ? minorStepSize
                          : stepSize;
                const precision = decimalPlaces(minorStepSize ?? stepSize),
                    next = stepValue(
                        value === '' ? '0' : value,
                        direction * step,
                        precision,
                        locale
                    );
                if (next !== value) emit(next);
            } else if (allowNumericCharactersOnly && !isNumericKeyEvent(e, locale)) {
                e.preventDefault();
            }
        }
        onKeyDown?.(e);
    };

    return h(
        'div',
        {className: classNames('bp6-control-group', 'bp6-numeric-input', className)},
        h(InputGroup, {
            autoComplete: 'off',
            id,
            role: allowNumericCharactersOnly ? 'spinbutton' : undefined,
            ...rest,
            'aria-valuenow': Number(toStringNumber(value, locale)),
            value,
            onChange,
            onKeyDown: onInputKeyDown,
            onPaste: () => (pasted.current = true)
        })
    );
};

//------------------------
// Implementation
//------------------------
function stepValue(value: string, delta: number, precision: number, locale: string): string {
    const current = toStringNumber(value, locale),
        num = Number(current);
    if (current === '' || isNaN(num)) return '';
    const scale = Math.pow(10, precision),
        next = Math.round((num + delta) * scale) / scale;
    return sanitize(
        next.toLocaleString(locale ?? 'en-US', {
            roundingPriority: 'morePrecision'
        } as Intl.NumberFormatOptions),
        locale
    );
}

/** The value as a string JavaScript can parse - localized digits and decimal separator undone. */
function toStringNumber(value: string, locale: string): string {
    if (parseFloat(value).toString() === value || locale === undefined) return value;
    const sep = decimalSeparator(locale),
        digits = localDigits(locale);
    return sanitize(value, locale)
        .split('')
        .map(c => (digits.includes(c) ? String(digits.indexOf(c)) : c))
        .join('')
        .replace(sep, '.');
}

/** Strip characters that cannot appear in a number, after converting full-width digits. */
function sanitize(value: string, locale: string): string {
    return value
        .replace(/[０-９]/g, m => String.fromCharCode(m.charCodeAt(0) - 0xfee0))
        .split('')
        .filter(c => isNumericChar(c, locale))
        .join('');
}

// Modified keys (copy, paste, select all) and keys that print no character are always allowed.
function isNumericKeyEvent(e: KeyboardEvent, locale: string): boolean {
    if (e.key == null || e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return true;
    return isNumericChar(e.key, locale);
}

function isNumericChar(c: string, locale: string): boolean {
    if (locale === undefined) return /^[Ee0-9+\-.]$/.test(c);
    const sep = decimalSeparator(locale).replace('.', '\\.');
    return new RegExp(`^[Ee${localDigits(locale).join('')}\\+\\-${sep}]$`).test(c);
}

function decimalSeparator(locale: string): string {
    const one = (1).toLocaleString(locale),
        nine = (9).toLocaleString(locale);
    return new RegExp(`${one}(.+)${nine}`).exec((1.9).toLocaleString(locale))?.[1] ?? '.';
}

function localDigits(locale: string): string[] {
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(it => it.toLocaleString(locale));
}

function decimalPlaces(num: number): number {
    if (num == null || !Number.isFinite(num)) return 0;
    let scale = 1,
        ret = 0;
    while (Math.round(num * scale) / scale !== num) {
        scale *= 10;
        ret++;
    }
    return ret;
}
