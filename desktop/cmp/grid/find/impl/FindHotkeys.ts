/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * A find box that Ctrl+F (Cmd+F on Mac) can focus.
 * @internal
 */
export interface FindHotkeyTarget {
    /** True if the box can take focus now - enabled, on screen and not covered. */
    readonly canFocus: boolean;

    /** The box's input element, which places it in the page's focus order. */
    readonly inputEl: Element;

    /** True if the element is within the box or the grid it searches. */
    contains(el: Element): boolean;

    /** Focus the box, selecting its text. */
    focusInput(): void;
}

/**
 * Choose the box Ctrl+F focuses, from those that can take focus:
 * 1. the box whose own input or grid holds focus.
 * 2. else the next box after the focused element in focus order, wrapping to the first - the
 *    first box on the page when nothing is focused.
 * Null if no box can take focus, leaving Ctrl+F to the browser.
 *
 * Focus order is taken as document order, which matches tab order unless an element sets a
 * positive `tabIndex`.
 * @internal
 */
export function resolveFindHotkeyTarget(
    targets: FindHotkeyTarget[],
    activeEl: Element
): FindHotkeyTarget {
    const eligible = targets
        .filter(it => it.canFocus && it.inputEl)
        .sort((a, b) => compareDocumentOrder(a.inputEl, b.inputEl));
    if (!eligible.length) return null;

    // The body holds focus when no element does.
    const focused = activeEl && activeEl !== activeEl.ownerDocument?.body ? activeEl : null;
    if (!focused) return eligible[0];

    return (
        eligible.find(it => it.contains(focused)) ??
        eligible.find(it => compareDocumentOrder(focused, it.inputEl) < 0) ??
        eligible[0]
    );
}

/**
 * True if the element is the one shown at its own center - so not hidden, outside the viewport,
 * or covered by another element such as a dialog or its backdrop.
 * @internal
 */
export function isOnScreen(el: Element): boolean {
    const {left, top, width, height} = el.getBoundingClientRect(),
        hit = document.elementFromPoint?.(left + width / 2, top + height / 2);
    return !!hit && el.contains(hit);
}

/**
 * Register a box to take Ctrl+F. A page-wide listener is installed while any box is registered.
 * @internal
 */
export function registerFindHotkeyTarget(target: FindHotkeyTarget) {
    if (!targets.size) window.addEventListener('keydown', onKeyDown);
    targets.add(target);
}

/** @internal */
export function unregisterFindHotkeyTarget(target: FindHotkeyTarget) {
    if (!targets.delete(target) || targets.size) return;
    window.removeEventListener('keydown', onKeyDown);
}

//------------------------
// Implementation
//------------------------
const targets = new Set<FindHotkeyTarget>();

// Listen on the window as the key bubbles up, so the focused component and any app handlers on
// the way see Ctrl+F first. One that handles it stops the event or marks it handled.
function onKeyDown(e: KeyboardEvent) {
    if (e.defaultPrevented) return;

    const isFind =
        (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key?.toLowerCase() === 'f';
    if (!isFind) return;

    const target = resolveFindHotkeyTarget([...targets], document.activeElement);
    if (!target) return;

    e.preventDefault();
    target.focusInput();
}

// Negative if `a` comes before `b` in the document, positive if after, 0 if the same element.
function compareDocumentOrder(a: Element, b: Element): number {
    if (a === b) return 0;
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}
