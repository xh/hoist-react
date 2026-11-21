/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {popover} from '@xh/hoist/cmp/popover';
import {dialog, type DialogProps} from '@xh/hoist/desktop/cmp/dialog';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createElement} from 'react';
import {beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * How the desktop Dialog opens, closes and holds focus. Hoist's own dialogs - messages, options,
 * exceptions, column choosers, view management - and app dialogs all build on it.
 */
describe('Dialog', () => {
    beforeAll(() => initTestAppAsync());

    const open = (props: DialogProps = {}) =>
        dialog({
            isOpen: true,
            title: 'Edit',
            children: createElement('button', {type: 'button'}, 'Inside'),
            ...props
        });

    it('renders an accessible modal dialog, labelled by its title', async () => {
        render(open());
        const el = await screen.findByRole('dialog');
        expect(el.getAttribute('aria-modal')).toBe('true');
        expect(el.getAttribute('aria-labelledby')).toBe(screen.getByText('Edit').id);
    });

    it('asks to close on Escape, on the close button and on a click outside', async () => {
        const onClose = vi.fn();
        render(open({onClose}));
        const el = await screen.findByRole('dialog');

        fireEvent.keyDown(el, {key: 'Escape'});
        fireEvent.click(screen.getByLabelText('Close'));
        fireEvent.mouseDown(document.querySelector('.xh-dialog__backdrop'));
        expect(onClose).toHaveBeenCalledTimes(3);
    });

    it('stays open on a click outside or Escape when told to', async () => {
        const onClose = vi.fn();
        render(open({onClose, canOutsideClickClose: false, canEscapeKeyClose: false}));
        const el = await screen.findByRole('dialog');

        fireEvent.keyDown(el, {key: 'Escape'});
        fireEvent.mouseDown(document.querySelector('.xh-dialog__backdrop'));
        expect(onClose).not.toHaveBeenCalled();
    });

    it('moves focus into the dialog on open, and back to where it was on close', async () => {
        const trigger = document.createElement('button');
        document.body.appendChild(trigger);
        trigger.focus();

        const {rerender} = render(open());
        const el = await screen.findByRole('dialog');
        await waitFor(() => expect(el.contains(document.activeElement)).toBe(true));

        rerender(open({isOpen: false}));
        await waitFor(() => expect(document.activeElement).toBe(trigger));
        trigger.remove();
    });

    it('closes only a popover within it on Escape', async () => {
        const onClose = vi.fn();
        render(
            open({
                onClose,
                children: popover({
                    content: createElement('button', {type: 'button'}, 'Choice'),
                    children: createElement('button', {type: 'button'}, 'Choose')
                })
            })
        );
        fireEvent.click(await screen.findByText('Choose'));
        const choice = await screen.findByText('Choice');

        fireEvent.keyDown(choice, {key: 'Escape'});
        await waitFor(() => expect(screen.queryByText('Choice')).toBeNull());
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('stops the page scrolling while open', async () => {
        const {rerender} = render(open());
        await screen.findByRole('dialog');
        expect(document.body.classList.contains('xh-overlay-open')).toBe(true);

        rerender(open({isOpen: false}));
        await waitFor(() =>
            expect(document.body.classList.contains('xh-overlay-open')).toBe(false)
        );
    });

    it('creates its portal before opening when not lazy', async () => {
        const before = document.querySelectorAll('[data-floating-ui-portal]').length;
        render(open({isOpen: false, lazy: false}));
        await waitFor(() =>
            expect(document.querySelectorAll('[data-floating-ui-portal]').length).toBe(before + 1)
        );
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
