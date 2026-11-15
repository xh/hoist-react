/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {separator, span} from '@xh/hoist/cmp/layout';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render} from '@testing-library/react';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * Separator is a visual rule, so assistive technology relies on its role, orientation and name to
 * report it. Its styles draw the rule from the orientation and label classes checked here.
 */
describe('Separator', () => {
    beforeAll(() => initTestAppAsync());

    it('is a horizontal separator with no label by default', () => {
        const el = renderSeparator();

        expect(el.getAttribute('role')).toBe('separator');
        expect(el.getAttribute('aria-orientation')).toBe('horizontal');
        expect(el.hasAttribute('aria-labelledby')).toBe(false);
        expect(el.className).toBe('xh-separator xh-separator--horizontal');
        expect(el.childNodes).toHaveLength(0);
    });

    it('reports a vertical orientation', () => {
        const el = renderSeparator({orientation: 'vertical'});

        expect(el.getAttribute('aria-orientation')).toBe('vertical');
        expect(el.classList).toContain('xh-separator--vertical');
        expect(el.classList).not.toContain('xh-separator--horizontal');
    });

    it('shows its label, centered, and takes its name from it', () => {
        const el = renderSeparator({label: 'Settlement'}),
            label = el.querySelector('.xh-separator__label');

        expect(label.textContent).toBe('Settlement');
        expect(el.getAttribute('aria-labelledby')).toBe(label.id);
        expect(el.classList).toContain('xh-separator--label-center');
    });

    it.each(['start', 'center', 'end'] as const)('positions its label at the %s', labelPosition => {
        const el = renderSeparator({label: span('Settlement'), labelPosition});

        expect(el.classList).toContain(`xh-separator--label-${labelPosition}`);
    });

    it.each([null, undefined, ''])('renders no label element for a label of %j', label => {
        const el = renderSeparator({label, labelPosition: 'start'});

        expect(el.childNodes).toHaveLength(0);
        expect(el.className).not.toMatch(/--label/);
    });

    it('applies layout props, testId and domAttrs to the separator', () => {
        const el = renderSeparator({margin: '10 0', testId: 'sep', domAttrs: {'data-section': 2}});

        expect(el.style.margin).toBe('10px 0px');
        expect(el.getAttribute('data-testid')).toBe('sep');
        expect(el.getAttribute('data-section')).toBe('2');
    });
});

function renderSeparator(props = {}): HTMLElement {
    return render(separator(props)).container.querySelector('.xh-separator');
}
