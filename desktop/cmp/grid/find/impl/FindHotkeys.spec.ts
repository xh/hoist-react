/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {describe, expect, it, onTestFinished} from 'vitest';
import type {FindHotkeyTarget} from './FindHotkeys';
import {
    isOnScreen,
    registerFindHotkeyTarget,
    resolveFindHotkeyTarget,
    unregisterFindHotkeyTarget
} from './FindHotkeys';

/**
 * Ctrl+F routing for `GridFindField({enableHotkey: true})` - which box it focuses when several
 * are on the page, and when it leaves the key to the focused component or the browser.
 */
describe('resolveFindHotkeyTarget', () => {
    it('picks the box whose grid holds focus, over the next box in focus order', () => {
        const [before, gridEl, after] = addElements(3),
            owner = fakeTarget({input: before, owns: gridEl}),
            next = fakeTarget({input: after});

        expect(resolveFindHotkeyTarget([next, owner], gridEl)).toBe(owner);
    });

    it('picks the next box after the focused element in document order', () => {
        const [first, focused, second, third] = addElements(4),
            a = fakeTarget({input: first}),
            b = fakeTarget({input: second}),
            c = fakeTarget({input: third});

        expect(resolveFindHotkeyTarget([c, a, b], focused)).toBe(b);
    });

    it('wraps to the first box when focus is after every box', () => {
        const [first, second, focused] = addElements(3),
            a = fakeTarget({input: first}),
            b = fakeTarget({input: second});

        expect(resolveFindHotkeyTarget([b, a], focused)).toBe(a);
    });

    it('picks the first box on the page when nothing is focused', () => {
        const [first, second] = addElements(2),
            a = fakeTarget({input: first}),
            b = fakeTarget({input: second});

        expect(resolveFindHotkeyTarget([b, a], document.body)).toBe(a);
        expect(resolveFindHotkeyTarget([b, a], null)).toBe(a);
    });

    it('skips boxes that cannot take focus, even one whose grid holds focus', () => {
        const [first, gridEl, second] = addElements(3),
            hidden = fakeTarget({input: first, owns: gridEl, canFocus: false}),
            visible = fakeTarget({input: second});

        expect(resolveFindHotkeyTarget([hidden, visible], gridEl)).toBe(visible);
    });

    it('leaves Ctrl+F to the browser when no box can take focus', () => {
        const [first] = addElements(1);
        expect(
            resolveFindHotkeyTarget([fakeTarget({input: first, canFocus: false})], document.body)
        ).toBeNull();
        expect(resolveFindHotkeyTarget([], document.body)).toBeNull();
    });
});

describe('registerFindHotkeyTarget', () => {
    it('focuses the box and blocks the browser find on Ctrl+F or Cmd+F', () => {
        const target = register(fakeTarget({input: addElements(1)[0]}));

        expect(pressFind(document.body, {ctrlKey: true}).defaultPrevented).toBe(true);
        expect(pressFind(document.body, {metaKey: true}).defaultPrevented).toBe(true);
        expect(target.focusCount).toBe(2);
    });

    it('ignores F with Shift or Alt, and without Ctrl or Cmd', () => {
        const target = register(fakeTarget({input: addElements(1)[0]}));

        expect(pressFind(document.body, {ctrlKey: true, shiftKey: true}).defaultPrevented).toBe(
            false
        );
        expect(pressFind(document.body, {ctrlKey: true, altKey: true}).defaultPrevented).toBe(
            false
        );
        expect(pressFind(document.body, {}).defaultPrevented).toBe(false);
        expect(target.focusCount).toBe(0);
    });

    it('leaves Ctrl+F to a focused component that handles it first', () => {
        const [input, handler, stopper] = addElements(3),
            target = register(fakeTarget({input}));
        handler.addEventListener('keydown', e => e.preventDefault());
        stopper.addEventListener('keydown', e => e.stopPropagation());

        pressFind(handler, {ctrlKey: true});
        pressFind(stopper, {ctrlKey: true});
        expect(target.focusCount).toBe(0);
    });

    it('leaves Ctrl+F to an app listener on the document that handles it', () => {
        const target = register(fakeTarget({input: addElements(1)[0]})),
            appHandler = (e: KeyboardEvent) => e.preventDefault();
        document.addEventListener('keydown', appHandler);
        onTestFinished(() => document.removeEventListener('keydown', appHandler));

        pressFind(document.body, {ctrlKey: true});
        expect(target.focusCount).toBe(0);
    });

    it('stops taking Ctrl+F once its last box is unregistered', () => {
        const target = fakeTarget({input: addElements(1)[0]});
        registerFindHotkeyTarget(target);
        unregisterFindHotkeyTarget(target);

        expect(pressFind(document.body, {ctrlKey: true}).defaultPrevented).toBe(false);
        expect(target.focusCount).toBe(0);
    });
});

/**
 * jsdom has no layout, so these tests set the element a browser reports at a point. Browsers report
 * none for a point outside the viewport.
 */
describe('isOnScreen', () => {
    it('is true for the element shown at its center', () => {
        const [el] = addElements(1);
        setElementAtPoint(el);
        expect(isOnScreen(el)).toBe(true);
    });

    it('is false for an element covered by another, such as a dialog backdrop', () => {
        const [el, backdrop] = addElements(2);
        setElementAtPoint(backdrop);
        expect(isOnScreen(el)).toBe(false);
    });

    it('is false for an element with nothing shown at its center, as outside the viewport', () => {
        const [el] = addElements(1);
        setElementAtPoint(null);
        expect(isOnScreen(el)).toBe(false);
    });
});

//------------------
// Helpers
//------------------
interface FakeTarget extends FindHotkeyTarget {
    focusCount: number;
}

function fakeTarget({
    input,
    owns = null as Element,
    canFocus = true
}: {
    input: Element;
    owns?: Element;
    canFocus?: boolean;
}): FakeTarget {
    return {
        canFocus,
        inputEl: input,
        focusCount: 0,
        contains: el => input.contains(el) || !!owns?.contains(el),
        focusInput() {
            this.focusCount++;
        }
    };
}

// Elements appended to the body in order, removed when the test ends.
function addElements(count: number): HTMLElement[] {
    const ret = Array.from({length: count}, () => document.createElement('div'));
    ret.forEach(it => document.body.appendChild(it));
    onTestFinished(() => ret.forEach(it => it.remove()));
    return ret;
}

function register(target: FakeTarget): FakeTarget {
    registerFindHotkeyTarget(target);
    onTestFinished(() => unregisterFindHotkeyTarget(target));
    return target;
}

function pressFind(el: Element, mods: KeyboardEventInit): KeyboardEvent {
    const e = new KeyboardEvent('keydown', {key: 'f', bubbles: true, cancelable: true, ...mods});
    el.dispatchEvent(e);
    return e;
}

// Make `el` the element found at any point on screen.
function setElementAtPoint(el: Element) {
    const prev = document.elementFromPoint;
    document.elementFromPoint = () => el;
    onTestFinished(() => {
        document.elementFromPoint = prev;
    });
}
