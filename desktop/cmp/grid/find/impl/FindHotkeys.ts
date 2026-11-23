/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {maxBy} from 'lodash';

/**
 * A find box that Ctrl+F (Cmd+F on Mac) can focus.
 * @internal
 */
export interface FindHotkeyTarget {
    /** True if the box can take focus now - enabled and on screen. */
    readonly canFocus: boolean;

    /** True if the element is within the box or the grid it searches. */
    contains(el: Element): boolean;

    /** Focus the box, selecting its text. */
    focusInput(): void;
}

/** A target with its last use - a rising sequence number, 0 if never used. */
export type FindHotkeyEntry = [target: FindHotkeyTarget, lastUsed: number];

/**
 * Choose the box Ctrl+F focuses: the one whose grid (or itself) holds focus, else the one last
 * used, else the only one on screen. Null if none fits, leaving Ctrl+F to the browser.
 * @internal
 */
export function resolveFindHotkeyTarget(
    entries: FindHotkeyEntry[],
    activeEl: Element
): FindHotkeyTarget {
    const eligible = entries.filter(([target]) => target.canFocus),
        focused = activeEl ? eligible.find(([target]) => target.contains(activeEl)) : null;
    if (focused) return focused[0];

    const lastUsed = maxBy(
        eligible.filter(([, used]) => used > 0),
        ([, used]) => used
    );
    if (lastUsed) return lastUsed[0];

    return eligible.length === 1 ? eligible[0][0] : null;
}

/**
 * Register a box to take Ctrl+F. Page-wide listeners are installed while any box is registered.
 * @internal
 */
export function registerFindHotkeyTarget(target: FindHotkeyTarget) {
    if (!entries.size) {
        document.addEventListener('keydown', onKeyDown, true);
        document.addEventListener('focusin', onFocusIn, true);
    }
    if (!entries.has(target)) entries.set(target, 0);
}

/** @internal */
export function unregisterFindHotkeyTarget(target: FindHotkeyTarget) {
    if (!entries.delete(target) || entries.size) return;
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('focusin', onFocusIn, true);
}

//------------------------
// Implementation
//------------------------
const entries = new Map<FindHotkeyTarget, number>();
let useSeq = 0;

function onKeyDown(e: KeyboardEvent) {
    const isFind =
        (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key?.toLowerCase() === 'f';
    if (!isFind) return;

    const target = resolveFindHotkeyTarget([...entries], document.activeElement);
    if (!target) return;

    e.preventDefault();
    target.focusInput();
}

// Note the box whose grid (or itself) the user last worked in.
function onFocusIn(e: FocusEvent) {
    const el = e.target as Element;
    if (!(el instanceof Element)) return;
    for (const target of entries.keys()) {
        if (target.contains(el)) entries.set(target, ++useSeq);
    }
}
