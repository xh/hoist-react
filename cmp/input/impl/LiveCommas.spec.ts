/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {describe, expect, it} from 'vitest';
import {
    addCommasWhileEditing,
    getCaretSkippingCommas,
    setCaretSkippingCommas,
    skipCommaOnDelete
} from './LiveCommas';

// NumberInput's `displayWithCommas: 'always'` reformats on every keystroke. These helpers must keep
// partial entries intact and the caret next to the same digit, or typing becomes unusable.

function inputWith(value: string, caret: number): HTMLInputElement {
    const ret = document.createElement('input');
    ret.value = value;
    ret.setSelectionRange(caret, caret);
    return ret;
}

describe('LiveCommas', () => {
    describe('addCommasWhileEditing', () => {
        it.each([
            ['', ''],
            ['123', '123'],
            ['1234', '1,234'],
            ['1234567', '1,234,567'],
            ['1,2345', '12,345'],
            ['-', '-'],
            ['-1234', '-1,234'],
            ['1234.', '1,234.'],
            ['1234.50', '1,234.50'],
            ['1234.56789', '1,234.56789'],
            ['.5', '.5'],
            ['1500k', '1,500k'],
            ['1.5m', '1.5m'],
            ['1e+21', '1e+21']
        ])('formats %j as %j', (value, expected) => {
            expect(addCommasWhileEditing(value)).toBe(expected);
        });
    });

    describe('caret tracking', () => {
        it('keeps the caret after the same digit when a comma is added before it', () => {
            // User typed '4' after '123', caret at end.
            const input = inputWith('1234', 4),
                count = getCaretSkippingCommas(input);

            input.value = addCommasWhileEditing(input.value);
            setCaretSkippingCommas(input, count);

            expect(input.value).toBe('1,234');
            expect(input.selectionStart).toBe(5);
        });

        it('keeps the caret mid-value when a comma shifts', () => {
            // User typed '9' between '1,2' and '34', caret after the '9'.
            const input = inputWith('1,2934', 4),
                count = getCaretSkippingCommas(input);

            input.value = addCommasWhileEditing(input.value);
            setCaretSkippingCommas(input, count);

            expect(input.value).toBe('12,934');
            expect(input.value.slice(0, input.selectionStart)).toBe('12,9');
        });
    });

    describe('skipCommaOnDelete', () => {
        it('moves the caret before a comma on Backspace', () => {
            const input = inputWith('1,234', 2);
            skipCommaOnDelete(input, 'Backspace');
            expect(input.selectionStart).toBe(1);
        });

        it('moves the caret past a comma on Delete', () => {
            const input = inputWith('1,234', 1);
            skipCommaOnDelete(input, 'Delete');
            expect(input.selectionStart).toBe(2);
        });

        it('leaves the caret alone when no comma is adjacent', () => {
            const input = inputWith('1,234', 4);
            skipCommaOnDelete(input, 'Backspace');
            expect(input.selectionStart).toBe(4);
        });

        it('leaves a selected range alone', () => {
            const input = inputWith('1,234', 0);
            input.setSelectionRange(1, 3);
            skipCommaOnDelete(input, 'Delete');
            expect([input.selectionStart, input.selectionEnd]).toEqual([1, 3]);
        });
    });
});
