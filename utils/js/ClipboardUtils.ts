/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * Copy the given text to the system clipboard.
 *
 * Uses the modern async Clipboard API when available (requires a secure browsing context).
 * Falls back to the legacy `document.execCommand('copy')` approach via a hidden, briefly-selected
 * `<span>` for older or non-secure contexts. Rejects with a `NotAllowedError` if both paths fail.
 *
 * Adapted from the (unmaintained) `clipboard-copy` package by Feross Aboukhadijeh,
 * https://github.com/feross/clipboard-copy - MIT licensed.
 */
export async function copyToClipboard(text: string): Promise<void> {
    try {
        await copyViaClipboardApi(text);
    } catch (apiErr) {
        try {
            copyViaExecCommand(text);
        } catch (cmdErr) {
            throw cmdErr || apiErr || notAllowed();
        }
    }
}

//-------------------
//  Implementation
//-------------------
async function copyViaClipboardApi(text: string): Promise<void> {
    if (!navigator.clipboard) throw notAllowed();
    return navigator.clipboard.writeText(text);
}

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
    if (!success) throw notAllowed();
}

function notAllowed(): DOMException {
    return new DOMException('The request is not allowed', 'NotAllowedError');
}
