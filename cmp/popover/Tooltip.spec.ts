/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {tooltip, type TooltipProps} from '@xh/hoist/cmp/popover';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createElement} from 'react';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * How Hoist's Tooltip opens and how assistive tech sees it. Form validation messages, tab and card
 * hints, and sparkline values show in it.
 */
describe('Tooltip', () => {
    beforeAll(() => initTestAppAsync());

    const withTooltip = (props: TooltipProps = {}) =>
        tooltip({
            content: 'Hint',
            hoverOpenDelay: 0,
            children: createElement('span', null, 'Target'),
            ...props
        });

    it('opens while the pointer rests on its target, and closes when it leaves', async () => {
        render(withTooltip());

        fireEvent.mouseEnter(screen.getByText('Target'));
        await screen.findByText('Hint');

        fireEvent.mouseLeave(screen.getByText('Target'));
        await waitFor(() => expect(screen.queryByText('Hint')).toBeNull());
    });

    it('opens when its target takes keyboard focus, and makes the target focusable', async () => {
        render(withTooltip());
        const target = screen.getByText('Target');
        expect(target.tabIndex).toBe(0);

        fireEvent.focus(target);
        await screen.findByText('Hint');
    });

    it('presents itself as a tooltip, not a popup menu', async () => {
        render(withTooltip({defaultIsOpen: true}));
        await screen.findByText('Hint');

        expect(screen.getByRole('tooltip').textContent).toBe('Hint');
        expect(screen.getByText('Target').hasAttribute('aria-haspopup')).toBe(false);
    });

    it('does not open while disabled', async () => {
        render(withTooltip({disabled: true}));
        fireEvent.mouseEnter(screen.getByText('Target'));
        await new Promise(r => setTimeout(r, 20));
        expect(screen.queryByText('Hint')).toBeNull();
    });

    it('opens from a target drawn by renderTarget', async () => {
        render(
            tooltip({
                content: 'Hint',
                hoverOpenDelay: 0,
                renderTarget: ({isOpen, ...props}) =>
                    createElement('span', {...props, 'data-open': String(isOpen)}, 'Drawn')
            })
        );
        fireEvent.mouseEnter(screen.getByText('Drawn'));
        await screen.findByText('Hint');
        expect(screen.getByText('Drawn').getAttribute('data-open')).toBe('true');
    });
});
