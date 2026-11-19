/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * Parsing and matching of hotkey combos such as `'shift + s'` or `'mod + enter'`. Accepts the same
 * syntax, aliases and shifted symbols as Blueprint's hotkeys, so existing combos keep working.
 */
export interface KeyCombo {
    /** Bitmask of the modifier keys held - see `MODIFIER_BITS`. */
    modifiers: number;
    /** The one non-modifier key, lower-cased, or undefined for a combo of modifiers alone. */
    key: string;
}

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

const MODIFIER_BITS: Record<string, number> = {alt: 1, ctrl: 2, meta: 4, shift: 8};

const ALIASES: Record<string, string> = {
    cmd: 'meta',
    command: 'meta',
    del: 'delete',
    esc: 'escape',
    minus: '-',
    mod: isMac() ? 'meta' : 'ctrl',
    option: 'alt',
    plus: '+',
    return: 'enter',
    win: 'meta',
    up: 'arrowup',
    down: 'arrowdown',
    left: 'arrowleft',
    right: 'arrowright'
};

/** Shifted symbols on a US keyboard, mapped to the key that types them with Shift. */
const SHIFTED_SYMBOLS: Record<string, string> = {
    '~': '`',
    _: '-',
    '+': '=',
    '{': '[',
    '}': ']',
    '|': '\\',
    ':': ';',
    '"': "'",
    '<': ',',
    '>': '.',
    '?': '/'
};

/** Parse a combo string. A shifted symbol becomes Shift plus its key, so `'?'` is `'shift + /'`. */
export function parseKeyCombo(combo: string): KeyCombo {
    let modifiers = 0,
        key: string;
    for (let piece of combo.replace(/\s/g, '').toLowerCase().split('+')) {
        if (piece === '') {
            throw new Error(
                `Failed to parse key combo "${combo}". Valid combos look like "cmd + plus", "shift+p" or "!".`
            );
        }
        piece = ALIASES[piece] ?? piece;
        if (MODIFIER_BITS[piece] != null) {
            modifiers += MODIFIER_BITS[piece];
        } else if (SHIFTED_SYMBOLS[piece] != null) {
            modifiers += MODIFIER_BITS.shift;
            key = SHIFTED_SYMBOLS[piece];
        } else {
            key = piece;
        }
    }
    return {modifiers, key};
}

/**
 * The combo a keyboard event represents. Letters follow the keyboard layout. Digits and keys
 * typed with Alt follow the physical key, so Shift+1 is `'shift + 1'` and Alt+C on a Mac is
 * `'alt + c'`, not `'ç'`.
 */
export function getKeyCombo(e: KeyboardEvent): KeyCombo {
    let key: string;
    if (!MODIFIER_KEYS.has(e.key)) {
        const codeKey = keyFromCode(e.code);
        if (e.code === 'Space' || e.code === 'Delete') {
            key = codeKey;
        } else if (e.altKey && isAltCharacter(e.key) && codeKey != null) {
            key = codeKey;
        } else if (e.code?.startsWith('Digit') && codeKey != null) {
            key = codeKey;
        } else {
            key = e.key?.toLowerCase() ?? codeKey;
        }
    }

    let modifiers = 0;
    if (e.altKey) modifiers += MODIFIER_BITS.alt;
    if (e.ctrlKey) modifiers += MODIFIER_BITS.ctrl;
    if (e.metaKey) modifiers += MODIFIER_BITS.meta;
    if (e.shiftKey) {
        modifiers += MODIFIER_BITS.shift;
        if (SHIFTED_SYMBOLS[e.key] != null) key = SHIFTED_SYMBOLS[e.key];
    }
    return {modifiers, key};
}

export function comboMatches(a: KeyCombo, b: KeyCombo): boolean {
    return a.modifiers === b.modifiers && a.key === b.key;
}

/**
 * The keys of a combo for display, with aliases resolved, single characters upper-cased and Meta
 * shown as `cmd` on a Mac and `ctrl` elsewhere. Shifted symbols are left as typed.
 */
export function comboKeysForDisplay(combo: string): string[] {
    return combo
        .replace(/\s/g, '')
        .split('+')
        .map(it => {
            const key = ALIASES[it.toLowerCase()] ?? it;
            if (key === 'meta') return isMac() ? 'cmd' : 'ctrl';
            return key.length === 1 ? key.toUpperCase() : key;
        });
}

/**
 * True if a key event's target takes typed text, so hotkeys without `allowInInput` ignore it.
 * Checkboxes, radio buttons and read-only fields do not count.
 */
export function isTextInput(el: EventTarget): boolean {
    const editable = (el as Element)?.closest?.(
        'input, textarea, [contenteditable=true]'
    ) as HTMLInputElement;
    if (!editable) return false;
    if (editable.tagName === 'INPUT' && ['checkbox', 'radio'].includes(editable.type)) {
        return false;
    }
    return !editable.readOnly;
}

export function isMac(): boolean {
    const platform = typeof navigator !== 'undefined' ? navigator.platform : null;
    return platform != null && /Mac|iPod|iPhone|iPad/.test(platform);
}

//------------------------
// Implementation
//------------------------
function keyFromCode(code: string): string {
    if (code == null) return undefined;
    if (code.startsWith('Key')) return code.substring(3).toLowerCase();
    if (code.startsWith('Digit')) return code.substring(5);
    if (code === 'Space' || code === 'Delete') return code.toLowerCase();
    return undefined;
}

function isAltCharacter(key: string): boolean {
    if (key?.length !== 1) return false;
    const code = key.charCodeAt(0);
    return code > 127 || code < 32;
}
