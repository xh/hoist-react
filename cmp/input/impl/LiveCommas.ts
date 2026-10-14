/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * Helpers for NumberInput's `displayWithCommas: 'always'` mode, which groups digits while the user
 * types. Commas are the only characters a reformat adds or removes, so the caret is tracked as a
 * count of the non-comma characters before it.
 * @internal
 */

/**
 * Group the leading integer digits of a partially typed number with commas. Everything after them
 * (decimals, exponent, shorthand unit) is kept as typed.
 */
export function addCommasWhileEditing(value: string): string {
    return value
        .replace(/,/g, '')
        .replace(
            /^(\s*[-+]?)(\d+)/,
            (_, sign, digits) => sign + digits.replace(/\B(?=(\d{3})+$)/g, ',')
        );
}

/** Count of non-comma characters before the caret, or null if the input has no caret. */
export function getCaretSkippingCommas(input: HTMLInputElement): number {
    const {selectionStart, value} = input;
    return selectionStart == null ? null : value.slice(0, selectionStart).replace(/,/g, '').length;
}

/** Place the caret after the given count of non-comma characters. */
export function setCaretSkippingCommas(input: HTMLInputElement, count: number) {
    const {value} = input;
    let idx = 0;
    for (; idx < value.length && count > 0; idx++) {
        if (value[idx] !== ',') count--;
    }
    input.setSelectionRange(idx, idx);
}

/**
 * `beforeinput` listener that steps the caret over an adjacent comma before Backspace or Delete, so
 * the key removes the digit beyond it. Otherwise the reformat would restore the deleted comma.
 * Listens for the native event, which (unlike `keydown`) reports deletes from mobile soft keyboards.
 */
export function skipCommaOnDelete(ev: InputEvent) {
    const input = ev.target as HTMLInputElement,
        {selectionStart: start, selectionEnd: end, value} = input;
    if (start == null || start !== end) return;

    if (ev.inputType === 'deleteContentBackward' && value[start - 1] === ',') {
        input.setSelectionRange(start - 1, start - 1);
    } else if (ev.inputType === 'deleteContentForward' && value[start] === ',') {
        input.setSelectionRange(start + 1, start + 1);
    }
}
