/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {popover} from '@xh/hoist/cmp/popover';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createElement} from 'react';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * How the shared Popover behaves in a mobile app. Mobile's MenuButton opens its menu in it.
 */
describe('Popover (mobile)', () => {
    beforeAll(() => initTestAppAsync({isMobileApp: true}));

    const withPopover = (props = {}) =>
        popover({
            className: 'my-trigger',
            content: createElement('div', null, 'Body'),
            children: createElement('button', {type: 'button'}, 'Open'),
            ...props
        });

    it('keeps its class names on an outer element around the target', () => {
        const {container} = render(withPopover());
        const outer = container.firstElementChild;
        expect(outer.tagName).toBe('DIV');
        expect(outer.classList).toContain('xh-popover');
        expect(outer.classList).toContain('my-trigger');
        expect(outer.firstElementChild.classList).toContain('xh-popover__target-wrapper');
    });

    it('closes on a tap outside, which its backdrop catches', async () => {
        render(withPopover());
        fireEvent.click(screen.getByText('Open'));
        await screen.findByText('Body');

        const backdrop = document.querySelector('.xh-popover__content-overlay');
        expect(backdrop).not.toBeNull();
        expect(backdrop.classList).not.toContain('xh-popover__content-overlay--backdrop');

        fireEvent.pointerDown(backdrop);
        fireEvent.mouseDown(backdrop);
        await waitFor(() => expect(screen.queryByText('Body')).toBeNull());
    });

    it('opens without an arrow, fixed in place', async () => {
        render(withPopover({isOpen: true}));
        await screen.findByText('Body');
        const floating = document.querySelector<HTMLElement>('.xh-popover__floating');
        expect(floating.style.position).toBe('fixed');
        expect(document.querySelector('.xh-popover__arrow')).toBeNull();
    });
});
