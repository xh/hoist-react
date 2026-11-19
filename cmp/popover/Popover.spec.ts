/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {popover, type PopoverProps, portalContainerProvider} from '@xh/hoist/cmp/popover';
import {XH} from '@xh/hoist/core';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createElement} from 'react';
import {beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * How Hoist's Popover opens, closes and nests. Menus, pickers and choosers across desktop build on
 * it, and app tests drive it through these same interactions.
 */
describe('Popover', () => {
    beforeAll(() => initTestAppAsync());

    const target = (text = 'Open') => createElement('button', {type: 'button'}, text);

    const withPopover = (props: PopoverProps = {}) =>
        popover({content: createElement('div', null, 'Body'), children: target(), ...props});

    it('opens on a click of its target and closes on a second click', async () => {
        render(withPopover());

        fireEvent.click(screen.getByText('Open'));
        await screen.findByText('Body');

        fireEvent.click(screen.getByText('Open'));
        await waitFor(() => expect(screen.queryByText('Body')).toBeNull());
    });

    it('closes when the route changes', async () => {
        render(withPopover());
        fireEvent.click(screen.getByText('Open'));
        await screen.findByText('Body');

        // The router does not run in tests - set its state as a navigation would.
        act(() => XH.routerModel['setCurrentState']({name: 'other', params: {}}));
        await waitFor(() => expect(screen.queryByText('Body')).toBeNull());
    });

    it('renders a component given as content', async () => {
        const content = () => createElement('div', null, 'From function');
        render(withPopover({content, isOpen: true}));
        expect(await screen.findByText('From function')).toBeTruthy();
    });

    it('dims the page behind it with backdrop', async () => {
        render(withPopover({isOpen: true, backdrop: true}));
        await screen.findByText('Body');
        expect(document.querySelector('.xh-popover__content-overlay--backdrop')).not.toBeNull();
    });

    it('reports interaction without changing state when controlled', async () => {
        const onInteraction = vi.fn();
        render(withPopover({isOpen: true, onInteraction}));
        await screen.findByText('Body');

        fireEvent.keyDown(screen.getByText('Body'), {key: 'Escape'});
        expect(onInteraction).toHaveBeenCalledWith(false, expect.anything());
        expect(screen.getByText('Body')).toBeTruthy();
    });

    it('closes on Escape and returns focus to its target', async () => {
        render(withPopover());
        fireEvent.click(screen.getByText('Open'));
        const body = await screen.findByText('Body');

        fireEvent.keyDown(body, {key: 'Escape'});
        await waitFor(() => expect(screen.queryByText('Body')).toBeNull());
        await waitFor(() => expect(document.activeElement).toBe(screen.getByText('Open')));
    });

    it('closes on a click outside it', async () => {
        render(
            createElement(
                'div',
                null,
                withPopover(),
                createElement('button', {type: 'button'}, 'Elsewhere')
            )
        );
        fireEvent.click(screen.getByText('Open'));
        await screen.findByText('Body');

        fireEvent.pointerDown(screen.getByText('Elsewhere'));
        fireEvent.mouseDown(screen.getByText('Elsewhere'));
        await waitFor(() => expect(screen.queryByText('Body')).toBeNull());
    });

    it('closes when an element with the dismiss class is clicked, unless it is disabled', async () => {
        render(
            withPopover({
                content: createElement(
                    'div',
                    null,
                    createElement(
                        'button',
                        {className: 'xh-popover-dismiss', disabled: true},
                        'Off'
                    ),
                    createElement('button', {className: 'xh-popover-dismiss'}, 'Done')
                )
            })
        );
        fireEvent.click(screen.getByText('Open'));

        fireEvent.click(await screen.findByText('Off'));
        expect(screen.getByText('Done')).toBeTruthy();

        fireEvent.click(screen.getByText('Done'));
        await waitFor(() => expect(screen.queryByText('Done')).toBeNull());
    });

    it('stays open while a popover opened from within it is used', async () => {
        render(
            withPopover({
                content: popover({
                    content: createElement('button', {type: 'button'}, 'Inner item'),
                    children: target('Open inner')
                })
            })
        );
        fireEvent.click(screen.getByText('Open'));
        fireEvent.click(await screen.findByText('Open inner'));
        const inner = await screen.findByText('Inner item');

        fireEvent.pointerDown(inner);
        fireEvent.mouseDown(inner);
        fireEvent.click(inner);
        expect(screen.getByText('Open inner')).toBeTruthy();
    });

    it('stays open while an overlay from another library, opened after it, is used', async () => {
        // Floating UI ignores such presses itself only while it manages focus, so test without.
        render(withPopover({autoFocus: false}));
        fireEvent.click(screen.getByText('Open'));
        await screen.findByText('Body');

        // As a react-select menu or AG Grid popup does, mount a layer on the body after the popover.
        const layer = document.createElement('div');
        layer.textContent = 'Foreign layer';
        document.body.appendChild(layer);

        fireEvent.pointerDown(layer);
        fireEvent.mouseDown(layer);
        expect(screen.getByText('Body')).toBeTruthy();
        layer.remove();
    });

    it('opens while hovered, after its delay, when interactionKind is hover', async () => {
        render(withPopover({interactionKind: 'hover', hoverOpenDelay: 10, hoverCloseDelay: 10}));

        fireEvent.mouseEnter(screen.getByText('Open'));
        await screen.findByText('Body');

        fireEvent.mouseLeave(screen.getByText('Open'));
        await waitFor(() => expect(screen.queryByText('Body')).toBeNull());
    });

    it('does not open while disabled', () => {
        render(withPopover({disabled: true}));
        fireEvent.click(screen.getByText('Open'));
        expect(screen.queryByText('Body')).toBeNull();
    });

    it('portals into the container set by portalContainerProvider', async () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        render(portalContainerProvider({container, children: withPopover({defaultIsOpen: true})}));

        const body = await screen.findByText('Body');
        expect(container.contains(body)).toBe(true);
        container.remove();
    });

    it('puts its testId on the target wrapper', () => {
        render(withPopover({testId: 'my-popover'}));
        expect(screen.getByTestId('my-popover').contains(screen.getByText('Open'))).toBe(true);
    });
});
