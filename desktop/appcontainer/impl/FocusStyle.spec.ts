/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {installFocusStyle} from '@xh/hoist/desktop/appcontainer/impl/FocusStyle';
import {fireEvent} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

/**
 * Desktop apps hide focus outlines while the user works with the mouse, and show them once the
 * user presses Tab.
 */
describe('installFocusStyle', () => {
    const root = document.documentElement;

    it('hides focus outlines after a mouse press and shows them again on Tab', () => {
        installFocusStyle();
        installFocusStyle(); // A second call adds no more listeners.

        fireEvent.mouseDown(root);
        expect(root.classList).toContain('xh-focus-disabled');
        expect(root.classList).toContain('bp6-focus-disabled');

        fireEvent.keyDown(root, {key: 'a'});
        expect(root.classList).toContain('xh-focus-disabled');

        fireEvent.keyDown(root, {key: 'Tab'});
        expect(root.classList).not.toContain('xh-focus-disabled');
        expect(root.classList).not.toContain('bp6-focus-disabled');

        fireEvent.mouseDown(root);
        expect(root.classList).toContain('xh-focus-disabled');
    });
});
