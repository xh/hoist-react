/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {card, CardModel} from '@xh/hoist/cmp/card';
import {htmlButton, span} from '@xh/hoist/cmp/layout';
import {cardHeaderImpl} from '@xh/hoist/desktop/cmp/card/impl/CardHeaderImpl';
import {installDesktopImpls} from '@xh/hoist/dynamics/desktop';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, it, onTestFinished} from 'vitest';

/**
 * Apps style and test against a Card's markup, so a card that sets none of the optional header
 * and footer props must keep the markup it always had. The collapsed state lives on CardModel,
 * and must stay consistent when an app changes whether the card can collapse.
 */
describe('Card', () => {
    beforeAll(async () => {
        await initTestAppAsync();
        // The desktop AppContainer installs this impl - a test renders without one.
        installDesktopImpls({cardHeaderImpl});
    });

    describe('markup with no optional props', () => {
        it('is a fieldset with a plain legend that holds only the header', () => {
            const {container} = render(card({title: 'Details', item: span('Body')}));
            const fieldset = container.querySelector('fieldset.xh-card'),
                legend = fieldset.querySelector('legend');

            expect(Array.from(fieldset.children).map(it => it.tagName)).toEqual(['LEGEND', 'DIV']);
            expect(legend.className).toBe('');
            expect(legend.children).toHaveLength(1);
            expect(legend.firstElementChild.className).toBe(
                'xh-card__header xh-card__header--intent-none'
            );
            expect(legend.firstElementChild.innerHTML).toBe('Details');
            expect(fieldset.lastElementChild.classList).toContain('xh-card__content');
        });

        it('has no legend when it has no title or icon', () => {
            const {container} = render(card({item: span('Body')}));

            expect(container.querySelector('legend')).toBeNull();
            expect(container.querySelector('.xh-card').children).toHaveLength(1);
        });
    });

    describe('subtitle', () => {
        it('follows the title in the header', () => {
            const {container} = render(card({title: 'Positions', subtitle: '12 rows'}));
            const header = container.querySelector('.xh-card__header');

            expect(header.textContent).toBe('Positions12 rows');
            expect(header.lastElementChild.className).toBe('xh-card__subtitle');
        });

        it('gives a card with no title a header of its own', () => {
            const {container} = render(card({subtitle: '12 rows'}));

            expect(container.querySelector('legend .xh-card__subtitle').textContent).toBe(
                '12 rows'
            );
        });

        it('sits inside the header button of a collapsible card', () => {
            const {container} = render(
                card({title: 'Positions', subtitle: '12 rows', modelConfig: {collapsible: true}})
            );
            const button = container.querySelector('.xh-card__collapsible-header');

            expect(button.querySelector('.xh-card__subtitle').textContent).toBe('12 rows');
        });
    });

    describe('blank content', () => {
        const blanks: [string, any][] = [
            ['null', null],
            ['false', false],
            ['an empty string', ''],
            ['a string of spaces', '  ']
        ];

        it.each(blanks)(
            'renders no header for a subtitle of %s on a card with no title',
            (_, v) => {
                const {container} = render(card({subtitle: v, item: span('Body')}));

                expect(container.querySelector('legend')).toBeNull();
            }
        );

        it.each(blanks)('renders no footer for a footer of %s', (_, v) => {
            const {container} = render(card({title: 'Orders', footer: v}));

            expect(container.querySelector('.xh-card__footer')).toBeNull();
        });

        it.each([
            ['an array of false', [false]],
            ['an array of blank nodes', [null, '', [false]]],
            ['null', null]
        ])('keeps the plain legend for headerItems of %s', (_, headerItems) => {
            const titled = render(card({title: 'Orders', headerItems})).container,
                untitled = render(card({headerItems})).container;

            expect(titled.querySelector('legend').className).toBe('');
            expect(titled.querySelector('.xh-card__header-items')).toBeNull();
            expect(untitled.querySelector('legend')).toBeNull();
        });

        it('drops blank members from headerItems and keeps the others', () => {
            const {container} = render(
                card({title: 'Orders', headerItems: [false, span({className: 'my-item'}), null]})
            );

            expect(container.querySelector('.xh-card__header-items').children).toHaveLength(1);
        });
    });

    describe('accessible name', () => {
        it('is the title alone on a card with header items', () => {
            render(
                card({
                    title: 'Orders',
                    headerItems: [htmlButton('Export')],
                    item: span('Body')
                })
            );

            expect(screen.getByRole('group', {name: 'Orders'})).not.toBeNull();
            expect(screen.queryByRole('group', {name: /Export/})).toBeNull();
        });

        it('comes from the legend, with no added attribute, on a card with no header items', () => {
            const {container} = render(card({title: 'Orders', item: span('Body')}));

            expect(screen.getByRole('group', {name: 'Orders'})).not.toBeNull();
            expect(container.querySelector('.xh-card').hasAttribute('aria-labelledby')).toBe(false);
        });

        it('yields to an aria-label from domAttrs on a card with header items and no title', () => {
            render(
                card({headerItems: [htmlButton('Export')], domAttrs: {'aria-label': 'Order tools'}})
            );

            expect(screen.getByRole('group', {name: 'Order tools'})).not.toBeNull();
        });
    });

    describe('headerItems', () => {
        it('follow the header in the legend, after a rule that stands in for the border', () => {
            const {container} = render(
                card({title: 'Positions', headerItems: [span({className: 'my-item'})]})
            );
            const legend = container.querySelector('legend'),
                [header, rule, items] = Array.from(legend.children);

            expect(legend.className).toBe('xh-card__legend');
            expect(header.querySelector('.xh-card__header').textContent).toBe('Positions');
            expect(rule.className).toBe('xh-card__header-rule');
            expect(items.querySelector('.my-item')).not.toBeNull();
        });

        it('show on a card with no title', () => {
            const {container} = render(card({headerItems: [span({className: 'my-item'})]}));

            expect(container.querySelector('legend .my-item')).not.toBeNull();
            expect(container.querySelector('.xh-card__header')).toBeNull();
        });

        it('stay in the header of a collapsed card, and do not toggle it when clicked', () => {
            const model = new CardModel({collapsible: true, defaultCollapsed: true}),
                {container} = render(
                    card({model, title: 'Positions', headerItems: [span({className: 'my-item'})]})
                );

            fireEvent.click(container.querySelector('.my-item'));
            expect(model.collapsed).toBe(true);
            expect(container.querySelector('.my-item')).not.toBeNull();
        });

        it('leave the legend plain when empty', () => {
            const {container} = render(card({title: 'Positions', headerItems: []}));

            expect(container.querySelector('legend').className).toBe('');
        });
    });

    describe('footer', () => {
        it('renders after the content', () => {
            const {container} = render(
                card({title: 'Positions', footer: span('3 of 12'), item: span('Body')})
            );
            const fieldset = container.querySelector('.xh-card');

            expect(fieldset.lastElementChild.className).toBe('xh-card__footer');
            expect(fieldset.lastElementChild.textContent).toBe('3 of 12');
        });

        it('hides while the card is collapsed', () => {
            const model = new CardModel({collapsible: true, defaultCollapsed: true}),
                {container} = render(card({model, title: 'Positions', footer: span('3 of 12')}));
            expect(container.querySelector('.xh-card__footer')).toBeNull();

            act(() => model.setCollapsed(false));
            expect(container.querySelector('.xh-card__footer')).not.toBeNull();
        });
    });
});

describe('CardModel', () => {
    beforeAll(() => initTestAppAsync());

    describe('collapsible', () => {
        it('expands a collapsed card when set false', () => {
            const model = new CardModel({collapsible: true, defaultCollapsed: true});
            expect(model.collapsed).toBe(true);

            model.collapsible = false;
            expect(model.collapsed).toBe(false);
            expect(() => model.setCollapsed(true)).toThrow();
        });

        it('lets a card collapse once set true, and leaves it expanded until then', () => {
            const model = new CardModel({defaultCollapsed: true});
            expect(model.collapsed).toBe(false);

            model.collapsible = true;
            expect(model.collapsed).toBe(false);

            model.setCollapsed(true);
            expect(model.collapsed).toBe(true);
        });

        it('swaps the header between a button and plain text as it changes', () => {
            installDesktopImpls({cardHeaderImpl});
            const model = new CardModel(),
                {container} = render(card({model, title: 'Positions'}));
            expect(container.querySelector('.xh-card__collapsible-header')).toBeNull();

            act(() => {
                model.collapsible = true;
            });
            expect(container.querySelector('.xh-card__collapsible-header')).not.toBeNull();
            expect(container.querySelector('.xh-card__header')).toBeNull();
        });
    });

    // Fixed in v91 - a model made collapsible after construction ignored its stored state on
    // load, then overwrote it.
    describe('persisted collapsed state', () => {
        const KEY = 'testApp.jdoe.ordersCard',
            createModel = () => {
                const ret = new CardModel({
                    persistWith: {localStorageKey: 'ordersCard', debounce: 0}
                });
                onTestFinished(() => ret.destroy());
                return ret;
            };

        beforeEach(() => localStorage.clear());

        it('is restored when the card becomes collapsible after construction', () => {
            const first = createModel();
            first.collapsible = true;
            first.setCollapsed(true);
            expect(localStorage.getItem(KEY)).toBe('{"card":{"collapsed":true}}');

            const second = createModel();
            expect(second.collapsed).toBe(false);
            expect(localStorage.getItem(KEY)).toBe('{"card":{"collapsed":true}}');

            second.collapsible = true;
            expect(second.collapsed).toBe(true);
            expect(localStorage.getItem(KEY)).toBe('{"card":{"collapsed":true}}');
        });

        it('is kept while the card cannot collapse, and comes back when it can again', () => {
            const model = createModel();
            model.collapsible = true;
            model.setCollapsed(true);

            model.collapsible = false;
            expect(model.collapsed).toBe(false);
            expect(localStorage.getItem(KEY)).toBe('{"card":{"collapsed":true}}');

            model.collapsible = true;
            expect(model.collapsed).toBe(true);
        });

        it('keeps an expanded state that differs from the default', () => {
            const create = () => {
                const ret = new CardModel({
                    collapsible: true,
                    defaultCollapsed: true,
                    persistWith: {localStorageKey: 'ordersCard', debounce: 0}
                });
                onTestFinished(() => ret.destroy());
                return ret;
            };
            const first = create();
            first.setCollapsed(false);
            first.collapsible = false;
            first.collapsible = true;
            expect(first.collapsed).toBe(false);

            expect(create().collapsed).toBe(false);
        });

        it('stores nothing for a card that is never collapsible', () => {
            createModel();

            expect(localStorage.getItem(KEY)).toBeNull();
        });
    });
});
