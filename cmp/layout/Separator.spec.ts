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
        expect(el.childNodes).toHaveLength(0);
    });

    it('reports a vertical orientation', () => {
        expect(renderSeparator({orientation: 'vertical'}).getAttribute('aria-orientation')).toBe(
            'vertical'
        );
    });

    it('shows its label and takes its name from it', () => {
        const el = renderSeparator({label: span('Settlement')}),
            label = el.querySelector('.xh-separator__label');

        expect(label.textContent).toBe('Settlement');
        expect(el.getAttribute('aria-labelledby')).toBe(label.id);
    });

    // A blank label must leave no element behind: its gap would break the rule in two.
    it.each([null, undefined, '', '  ', false, true])(
        'renders no label element for a label of %j',
        label => {
            const el = renderSeparator({label, labelPosition: 'start'});

            expect(el.childNodes).toHaveLength(0);
            expect(el.hasAttribute('aria-labelledby')).toBe(false);
        }
    );

    it('shows no label when vertical', () => {
        const el = renderSeparator({orientation: 'vertical', label: 'Settlement'});

        expect(el.childNodes).toHaveLength(0);
        expect(el.hasAttribute('aria-labelledby')).toBe(false);
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
