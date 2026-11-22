/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {chip} from '@xh/hoist/cmp/chip';
import type {ChipProps} from '@xh/hoist/cmp/chip';
import {div} from '@xh/hoist/cmp/layout';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render} from '@testing-library/react';
import type {Mock} from 'vitest';
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * Chips sit inside other interactive surfaces - inspectors, toolbars, canvas widget headers - so
 * the keys a chip handles must not also reach an ancestor's shortcuts, and its remove button must
 * never fire the chip's own click. A chip with no handlers must stay out of the tab order.
 */
describe('Chip', () => {
    beforeAll(() => initTestAppAsync());

    let docKeyDown: Mock<(e: Event) => void>;
    afterEach(() => docKeyDown && document.removeEventListener('keydown', docKeyDown));

    it('renders a plain, unfocusable label when given no handlers', () => {
        const el = renderChip({children: 'Draft'});

        expect(el.textContent).toBe('Draft');
        expect(el.hasAttribute('role')).toBe(false);
        expect(el.hasAttribute('tabindex')).toBe(false);
        expect(part(el, 'remove')).toBeNull();
    });

    describe('onClick', () => {
        it('makes the chip a focusable button, called by click, Enter and Space', () => {
            const onClick = vi.fn(),
                el = renderChip({onClick, children: 'Rates'});

            expect(el.getAttribute('role')).toBe('button');
            expect(el.getAttribute('tabindex')).toBe('0');

            fireEvent.click(el);
            fireEvent.keyDown(el, {key: 'Enter'});
            fireEvent.keyDown(el, {key: ' '});
            expect(onClick).toHaveBeenCalledTimes(3);
        });

        it('stops Enter and Space from reaching ancestor key handlers', () => {
            const {el, ancestorKeyDown} = renderInAncestor({onClick: vi.fn(), children: 'Rates'});

            fireEvent.keyDown(el, {key: 'Enter'});
            fireEvent.keyDown(el, {key: ' '});
            expect(ancestorKeyDown).not.toHaveBeenCalled();
            expect(docKeyDown).not.toHaveBeenCalled();
        });

        it('lets keys it does not handle bubble', () => {
            const {el, ancestorKeyDown} = renderInAncestor({onClick: vi.fn(), children: 'Rates'});

            fireEvent.keyDown(el, {key: 'ArrowDown'});
            expect(ancestorKeyDown).toHaveBeenCalledTimes(1);
            expect(docKeyDown).toHaveBeenCalledTimes(1);
        });

        it('sets aria-pressed only when active is defined', () => {
            expect(renderChip({onClick: vi.fn(), active: true}).getAttribute('aria-pressed')).toBe(
                'true'
            );
            expect(renderChip({onClick: vi.fn(), active: false}).getAttribute('aria-pressed')).toBe(
                'false'
            );
            expect(renderChip({onClick: vi.fn()}).hasAttribute('aria-pressed')).toBe(false);
        });
    });

    describe('onRemove', () => {
        it('shows a remove button, named for the chip, that does not fire onClick', () => {
            const onClick = vi.fn(),
                onRemove = vi.fn(),
                el = renderChip({onClick, onRemove, children: 'risk-limits.xlsx'}),
                remove = part(el, 'remove');

            expect(remove.tagName).toBe('BUTTON');
            expect(remove.getAttribute('aria-label')).toBe('Remove risk-limits.xlsx');

            fireEvent.click(remove);
            expect(onRemove).toHaveBeenCalledTimes(1);
            expect(onClick).not.toHaveBeenCalled();
        });

        it('is called by Backspace and Delete on the chip or its remove button', () => {
            const onRemove = vi.fn(),
                el = renderChip({onClick: vi.fn(), onRemove, children: 'Rates'});

            fireEvent.keyDown(el, {key: 'Backspace'});
            fireEvent.keyDown(el, {key: 'Delete'});
            fireEvent.keyDown(part(el, 'remove'), {key: 'Delete'});
            expect(onRemove).toHaveBeenCalledTimes(3);
        });

        it('stops Backspace and Delete from reaching ancestor key handlers', () => {
            const {el, ancestorKeyDown} = renderInAncestor({onRemove: vi.fn(), children: 'Rates'});

            fireEvent.keyDown(part(el, 'remove'), {key: 'Backspace'});
            fireEvent.keyDown(part(el, 'remove'), {key: 'Delete'});
            expect(ancestorKeyDown).not.toHaveBeenCalled();
            expect(docKeyDown).not.toHaveBeenCalled();
        });

        it('keeps a removable chip with no onClick out of the tab order - its button is the stop', () => {
            const el = renderChip({onRemove: vi.fn(), children: 'Rates'});

            expect(el.hasAttribute('tabindex')).toBe(false);
            expect(part(el, 'remove').tabIndex).toBe(0);
        });
    });

    it('calls no handler and leaves the tab order when disabled', () => {
        const onClick = vi.fn(),
            onRemove = vi.fn(),
            el = renderChip({onClick, onRemove, disabled: true, children: 'Rates'});

        fireEvent.click(el);
        fireEvent.keyDown(el, {key: 'Enter'});
        fireEvent.keyDown(el, {key: 'Delete'});
        fireEvent.click(part(el, 'remove'));

        expect(onClick).not.toHaveBeenCalled();
        expect(onRemove).not.toHaveBeenCalled();
        expect(el.getAttribute('aria-disabled')).toBe('true');
        expect(el.hasAttribute('tabindex')).toBe(false);
        expect(part(el, 'remove').hasAttribute('disabled')).toBe(true);
    });

    it('lets a custom color take precedence over an intent', () => {
        const el = renderChip({intent: 'primary', color: 'var(--xh-purple)', children: 'Preset'});

        expect(el.style.getPropertyValue('--xh-chip-color')).toBe('var(--xh-purple)');
        expect(el.classList).toContain('xh-chip--custom');
        expect(el.className).not.toMatch(/--intent-/);
    });

    it('applies layout props, a class name and a test ID to its root', () => {
        const el = renderChip({
            className: 'my-chip',
            maxWidth: 140,
            testId: 'fund-chip',
            children: 'Rates'
        });

        expect(el.classList).toContain('my-chip');
        expect(el.style.maxWidth).toBe('140px');
        expect(el.getAttribute('data-testid')).toBe('fund-chip');
    });

    //------------------
    // Helpers
    //------------------
    function renderInAncestor(props: ChipProps) {
        const ancestorKeyDown = vi.fn();
        docKeyDown = vi.fn<(e: Event) => void>();
        document.addEventListener('keydown', docKeyDown);
        const el = render(
            div({onKeyDown: ancestorKeyDown, children: chip(props)})
        ).container.querySelector<HTMLElement>('.xh-chip');
        return {el, ancestorKeyDown};
    }
});

function renderChip(props: ChipProps): HTMLElement {
    return render(chip(props)).container.querySelector('.xh-chip');
}

function part(el: HTMLElement, name: string): HTMLElement {
    return el.querySelector(`.xh-chip__${name}`);
}
