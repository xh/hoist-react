/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';

/**
 * Copy the given text to the system clipboard.
 *
 * Uses the modern async Clipboard API when available, falling back to the legacy
 * `document.execCommand('copy')` approach for non-secure (`http://`) contexts where
 * `navigator.clipboard` is unavailable, and for secure-context cases where `writeText()`
 * itself rejects (no user activation, unfocused document, Permissions Policy denial).
 * Throws if both paths fail.
 *
 * Adapted from the (unmaintained) `clipboard-copy` package by Feross Aboukhadijeh,
 * https://github.com/feross/clipboard-copy - MIT licensed.
 *
 * TODO: consider dropping the execCommand fallback?
 */
export async function copyToClipboard(text: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        copyViaExecCommand(text);
    }
}

//-------------------
//  Implementation
//-------------------
function copyViaExecCommand(text: string): void {
    const span = document.createElement('span');
    span.textContent = text;
    // Preserve consecutive whitespace and newlines, and force the selection to span the full node.
    span.style.whiteSpace = 'pre';
    span.style.webkitUserSelect = 'auto';
    span.style.userSelect = 'all';
    document.body.appendChild(span);

    const selection = window.getSelection(),
        range = document.createRange();
    selection.removeAllRanges();
    range.selectNode(span);
    selection.addRange(range);

    let success = false;
    try {
        success = document.execCommand('copy');
    } finally {
        selection.removeAllRanges();
        document.body.removeChild(span);
    }
    if (!success) throw XH.exception('Clipboard copy not allowed');
}
