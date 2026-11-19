/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {render} from '@testing-library/react';
import {Icon} from '@xh/hoist/icon';
import {describe, expect, it} from 'vitest';

/**
 * `Icon.forIntent()` picks the icon that `Banner`, `Callout` and other components show for an
 * intent. An app that replaces one of those icons must see its choice in all of them. The
 * replacement lasts for the rest of the file, so this spec has a file of its own.
 */
describe('Icon.forIntent', () => {
    it.each([
        ['primary', 'circle-info'],
        ['success', 'circle-check'],
        ['warning', 'triangle-exclamation'],
        ['danger', 'circle-xmark']
    ] as const)('renders the standard icon for intent %s', (intent, faName) => {
        expect(glyph(Icon.forIntent(intent))).toBe(faName);
    });

    it('returns null for no intent', () => {
        expect(Icon.forIntent(null)).toBeNull();
        expect(Icon.forIntent(undefined)).toBeNull();
    });

    it('passes props to the icon', () => {
        const {container} = render(Icon.forIntent('warning', {title: 'Warning'}));

        expect(container.querySelector('svg').getAttribute('aria-label')).toBe('Warning');
    });

    // The two replacements below build on each other, in order.
    it('follows a replaced general icon, such as warning', () => {
        Icon.register({name: 'warning', faName: 'exclamation-circle', replace: true});

        expect(glyph(Icon.forIntent('warning'))).toBe('circle-exclamation');
    });

    it('renders a replaced intent alias in place of the general icon', () => {
        Icon.register({name: 'intentWarning', faName: 'exclamation-square', replace: true});

        expect(glyph(Icon.forIntent('warning'))).toBe('square-exclamation');
        expect(glyph(Icon.warning())).toBe('circle-exclamation');
    });
});

function glyph(icon: any): string {
    return render(icon).container.querySelector('svg').getAttribute('data-icon');
}
