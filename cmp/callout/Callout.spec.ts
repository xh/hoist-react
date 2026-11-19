/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {callout} from '@xh/hoist/cmp/callout';
import type {CalloutProps} from '@xh/hoist/cmp/callout';
import {span} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render} from '@testing-library/react';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * Callout content often streams in, or comes from a model or a tool, so a blank title or body must
 * leave no empty element, and a string must render as text, never as markdown. Each intent shows
 * its own icon, so that color is never the only signal.
 */
describe('Callout', () => {
    beforeAll(() => initTestAppAsync());

    it('is a note labelled by its title, over its body', () => {
        const el = renderCallout({title: 'Limit breach', children: span('VaR is 12% over')}),
            title = part(el, 'title');

        expect(el.getAttribute('role')).toBe('note');
        expect(el.getAttribute('aria-labelledby')).toBe(title.id);
        expect(title.textContent).toBe('Limit breach');
        expect(part(el, 'body').textContent).toBe('VaR is 12% over');
    });

    it.each([
        ['primary', 'circle-info', 'Info'],
        ['success', 'circle-check', 'Success'],
        ['warning', 'triangle-exclamation', 'Warning'],
        ['danger', 'circle-xmark', 'Error']
    ] as const)(
        'shows the standard icon for intent %s, named for screen readers',
        (intent, name, label) => {
            const el = renderCallout({intent, children: 'Text'}),
                svg = part(el, 'icon').querySelector('svg');

            expect(el.classList).toContain(`xh-callout--intent-${intent}`);
            expect(svg.getAttribute('data-icon')).toBe(name);
            expect(svg.getAttribute('aria-label')).toBe(label);
        }
    );

    it('shows no icon and no intent class with no intent, or a null one', () => {
        for (const intent of [undefined, null]) {
            const el = renderCallout({intent, children: 'Text'});

            expect(el.className).not.toMatch(/--intent-/);
            expect(part(el, 'icon')).toBeNull();
        }
    });

    // Matches Banner: undefined takes the default icon, and null shows none.
    it('shows a custom icon, the default for an undefined icon, and none for null', () => {
        const custom = renderCallout({intent: 'warning', icon: Icon.clock(), children: 'Text'});
        expect(iconName(custom)).toBe('clock');

        const undefinedIcon = renderCallout({intent: 'warning', icon: undefined, children: 'Text'});
        expect(iconName(undefinedIcon)).toBe('triangle-exclamation');

        const nullIcon = renderCallout({intent: 'warning', icon: null, children: 'Text'});
        expect(part(nullIcon, 'icon')).toBeNull();
    });

    // A title arrives before the body as content streams in.
    it.each([null, undefined, '', '  ', false, true, [null, false]])(
        'renders a title with no body element for a body of %j',
        children => {
            const el = renderCallout({title: 'Order submitted', children});

            expect(part(el, 'title')).not.toBeNull();
            expect(part(el, 'body')).toBeNull();
        }
    );

    it.each([null, undefined, '', '  ', false, true])(
        'renders a body with no title element, and no name, for a title of %j',
        title => {
            const el = renderCallout({title, children: 'Prices are delayed 15 minutes'});

            expect(part(el, 'title')).toBeNull();
            expect(el.hasAttribute('aria-labelledby')).toBe(false);
            expect(part(el, 'body')).not.toBeNull();
        }
    );

    it('renders nothing when both title and body are blank', () => {
        const {container} = render(callout({intent: 'danger', title: ' ', children: null}));

        expect(container.innerHTML).toBe('');
    });

    it('renders a string body as plain text, not markdown', () => {
        const body = part(
            renderCallout({children: '**bold** ![x](https://example.com/x.png)'}),
            'body'
        );

        expect(body.textContent).toBe('**bold** ![x](https://example.com/x.png)');
        expect(body.querySelector('img, strong')).toBeNull();
    });

    it('marks a compact callout with a modifier class, and a standard or null size with none', () => {
        expect(renderCallout({size: 'compact', children: 'Text'}).classList).toContain(
            'xh-callout--compact'
        );
        for (const size of ['standard', null] as const) {
            expect(renderCallout({size, children: 'Text'}).className).not.toMatch(/--compact/);
        }
    });

    it('applies layout props, a class name and a test ID to its root', () => {
        const el = renderCallout({
            className: 'my-callout',
            margin: 8,
            testId: 'stale-data',
            children: 'Text'
        });

        expect(el.classList).toContain('my-callout');
        expect(el.style.margin).toBe('8px');
        expect(el.getAttribute('data-testid')).toBe('stale-data');
    });
});

function renderCallout(props: CalloutProps): HTMLElement {
    return render(callout(props)).container.querySelector('.xh-callout');
}

function part(el: HTMLElement, name: string): HTMLElement {
    return el.querySelector(`.xh-callout__${name}`);
}

function iconName(el: HTMLElement): string {
    return part(el, 'icon').querySelector('svg').getAttribute('data-icon');
}
