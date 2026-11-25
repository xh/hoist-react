/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {describe, expect, it, onTestFinished} from 'vitest';
import type {FindHotkeyTarget} from './FindHotkeys';
import {
    registerFindHotkeyTarget,
    resolveFindHotkeyTarget,
    unregisterFindHotkeyTarget
} from './FindHotkeys';

/**
 * Ctrl+F routing for `GridFindField({enableHotkey: true})` - which box it focuses when several
 * are on the page, and when it leaves the key to the browser.
 */
describe('resolveFindHotkeyTarget', () => {
    it('picks the box whose grid holds focus, over one used more recently', () => {
        const focusedEl = document.createElement('div'),
            a = fakeTarget({owns: focusedEl}),
            b = fakeTarget();

        expect(
            resolveFindHotkeyTarget(
                [
                    [a, 1],
                    [b, 2]
                ],
                focusedEl
            )
        ).toBe(a);
    });

    it('picks the box last used when no grid holds focus', () => {
        const a = fakeTarget(),
            b = fakeTarget(),
            c = fakeTarget();

        expect(
            resolveFindHotkeyTarget(
                [
                    [a, 3],
                    [b, 5],
                    [c, 0]
                ],
                document.body
            )
        ).toBe(b);
    });

    it('picks the only box on screen when none has been used', () => {
        const a = fakeTarget(),
            hidden = fakeTarget({canFocus: false});

        expect(
            resolveFindHotkeyTarget(
                [
                    [a, 0],
                    [hidden, 0]
                ],
                document.body
            )
        ).toBe(a);
    });

    it('leaves Ctrl+F to the browser with several unused boxes on screen', () => {
        expect(
            resolveFindHotkeyTarget(
                [
                    [fakeTarget(), 0],
                    [fakeTarget(), 0]
                ],
                document.body
            )
        ).toBeNull();
    });

    it('skips boxes that cannot take focus, even if focused or last used', () => {
        const focusedEl = document.createElement('div'),
            hidden = fakeTarget({owns: focusedEl, canFocus: false}),
            visible = fakeTarget();

        expect(
            resolveFindHotkeyTarget(
                [
                    [hidden, 9],
                    [visible, 0]
                ],
                focusedEl
            )
        ).toBe(visible);
    });
});

describe('registerFindHotkeyTarget', () => {
    it('focuses the box and blocks the browser find on Ctrl+F or Cmd+F', () => {
        const target = fakeTarget();
        register(target);

        expect(pressFind({ctrlKey: true}).defaultPrevented).toBe(true);
        expect(pressFind({metaKey: true}).defaultPrevented).toBe(true);
        expect(target.focusCount).toBe(2);
    });

    it('ignores F with Shift or Alt, and without Ctrl or Cmd', () => {
        const target = fakeTarget();
        register(target);

        expect(pressFind({ctrlKey: true, shiftKey: true}).defaultPrevented).toBe(false);
        expect(pressFind({ctrlKey: true, altKey: true}).defaultPrevented).toBe(false);
        expect(pressFind({}).defaultPrevented).toBe(false);
        expect(target.focusCount).toBe(0);
    });

    it('tracks the box last used from focus entering its grid', () => {
        const gridA = document.createElement('div'),
            gridB = document.createElement('div'),
            a = fakeTarget({owns: gridA}),
            b = fakeTarget({owns: gridB});
        register(a);
        register(b);

        gridA.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
        gridB.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
        pressFind({ctrlKey: true});

        expect(b.focusCount).toBe(1);
        expect(a.focusCount).toBe(0);
    });

    it('stops taking Ctrl+F once its last box is unregistered', () => {
        const target = fakeTarget();
        registerFindHotkeyTarget(target);
        unregisterFindHotkeyTarget(target);

        expect(pressFind({ctrlKey: true}).defaultPrevented).toBe(false);
        expect(target.focusCount).toBe(0);
    });
});

//------------------
// Helpers
//------------------
interface FakeTarget extends FindHotkeyTarget {
    focusCount: number;
}

function fakeTarget({owns = null as Element, canFocus = true} = {}): FakeTarget {
    if (owns && !owns.isConnected) {
        document.body.appendChild(owns);
        onTestFinished(() => owns.remove());
    }
    return {
        canFocus,
        focusCount: 0,
        contains: el => !!owns?.contains(el),
        focusInput() {
            this.focusCount++;
        }
    };
}

function register(target: FindHotkeyTarget) {
    registerFindHotkeyTarget(target);
    onTestFinished(() => unregisterFindHotkeyTarget(target));
}

function pressFind(mods: KeyboardEventInit): KeyboardEvent {
    const e = new KeyboardEvent('keydown', {key: 'f', bubbles: true, cancelable: true, ...mods});
    document.body.dispatchEvent(e);
    return e;
}
