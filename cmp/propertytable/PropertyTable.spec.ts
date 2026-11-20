/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {propertyTable} from '@xh/hoist/cmp/propertytable';
import type {PropertyTableEntry} from '@xh/hoist/cmp/propertytable';
import {span} from '@xh/hoist/cmp/layout';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * PropertyTable shows the fields of a record, often from data with gaps. It must render every
 * entry it is given as a label and value pair, and stand a placeholder in for a missing value.
 * Its column count decides which entries end a row.
 */
describe('PropertyTable', () => {
    beforeAll(() => initTestAppAsync());

    it('renders each entry as a term and description, in order', () => {
        const {container} = render(
            propertyTable({
                entries: [
                    {label: 'Symbol', value: 'AAPL'},
                    {label: span('Side'), value: span({className: 'buy', children: 'Buy'})}
                ]
            })
        );
        const list = container.querySelector('dl.xh-property-table');

        expect(texts(list, 'dt')).toEqual(['Symbol', 'Side']);
        expect(texts(list, 'dd')).toEqual(['AAPL', 'Buy']);
        expect(list.querySelector('dd .buy')).not.toBeNull();
    });

    it.each([
        ['null', null],
        ['undefined', undefined]
    ])('shows the placeholder for a value that is %s', (_, value) => {
        const {container} = render(propertyTable({entries: [{label: 'Broker', value}]})),
            dd = container.querySelector('dd');

        expect(dd.textContent).toBe('-');
        expect(dd.classList).toContain('xh-property-table__value--null');
    });

    it.each([
        ['an empty string', '', ''],
        ['a blank string', '   ', '   '],
        ['true', true, ''],
        ['false', false, '']
    ])('renders a value that is %s as React does, not as the placeholder', (_, value, text) => {
        const {container} = render(propertyTable({entries: [{label: 'Broker', value}]})),
            dd = container.querySelector('dd');

        expect(dd.textContent).toBe(text);
        expect(dd.classList).not.toContain('xh-property-table__value--null');
    });

    it('shows zero as a value, not as the placeholder', () => {
        const {container} = render(propertyTable({entries: [{label: 'Fills', value: 0}]})),
            dd = container.querySelector('dd');

        expect(dd.textContent).toBe('0');
        expect(dd.classList).not.toContain('xh-property-table__value--null');
    });

    it('shows the default placeholder when nullDisplay is null', () => {
        const {container} = render(
            propertyTable({entries: [{label: 'Broker', value: null}], nullDisplay: null})
        );

        expect(container.querySelector('dd').textContent).toBe('-');
    });

    it.each([false, null, '  '])('renders an entry whose label is %j', label => {
        const {container} = render(propertyTable({entries: [{label, value: 'AAPL'}]}));

        expect(texts(container, 'dt').map(it => it.trim())).toEqual(['']);
        expect(texts(container, 'dd')).toEqual(['AAPL']);
    });

    it('shows a custom nullDisplay', () => {
        const {container} = render(
            propertyTable({entries: [{label: 'Broker', value: null}], nullDisplay: 'None'})
        );

        expect(container.querySelector('dd').textContent).toBe('None');
    });

    it('skips omitted and null entries', () => {
        const {container} = render(
            propertyTable({
                entries: [
                    {label: 'A', value: 1},
                    {label: 'B', value: 2, omit: true},
                    null,
                    {label: 'C', value: 3}
                ]
            })
        );

        expect(texts(container, 'dt')).toEqual(['A', 'C']);
    });

    it('renders nothing when given no entries, or only omitted ones', () => {
        expect(render(propertyTable({entries: []})).container.innerHTML).toBe('');
        expect(render(propertyTable({entries: null})).container.innerHTML).toBe('');
        expect(
            render(propertyTable({entries: [{label: 'A', value: 1, omit: true}]})).container
                .innerHTML
        ).toBe('');
    });

    it('shows emptyText in place of an empty list, with layout props and class name', () => {
        const root = render(propertyTable({entries: [], emptyText: 'No trade', width: 200}))
            .container.firstElementChild as HTMLElement;

        expect(root.classList).toContain('xh-property-table--empty');
        expect(root.textContent).toBe('No trade');
        expect(root.style.width).toBe('200px');
    });

    it("marks an entry with its intent, and leaves the others' classes alone", () => {
        const {container} = render(
            propertyTable({
                entries: [
                    {label: 'Status', value: 'Rejected', intent: 'danger'},
                    {label: 'Side', value: 'Buy'}
                ]
            })
        );
        const [status, side] = entries(container);

        expect(status.classList).toContain('xh-property-table__entry--intent-danger');
        expect(side.className).not.toMatch(/--intent/);
    });

    it('applies layout props and testId to the list', () => {
        const {container} = render(
            propertyTable({
                entries: [{label: 'A', value: 1}],
                maxWidth: 400,
                testId: 'trade-detail'
            })
        );
        const list = container.querySelector<HTMLElement>('.xh-property-table');

        expect(list.style.maxWidth).toBe('400px');
        expect(list.getAttribute('data-testid')).toBe('trade-detail');
    });

    it('aligns labels and values right only when the label is on the left', () => {
        const props = {
                entries: [{label: 'A', value: 1}],
                labelAlign: 'right' as const,
                valueAlign: 'right' as const
            },
            alignClasses = (labelSide: 'left' | 'top') =>
                Array.from(
                    render(propertyTable({...props, labelSide})).container.querySelector('dl')
                        .classList
                ).filter(it => it.includes('-align-'));

        expect(alignClasses('left')).toEqual([
            'xh-property-table--label-align-right',
            'xh-property-table--value-align-right'
        ]);
        expect(alignClasses('top')).toEqual([]);
    });

    describe('columns', () => {
        it('uses the given number of columns when the width allows', () => {
            setListWidth(500);
            const {container} = render(propertyTable({entries: fiveEntries(), columns: 2}));

            expect(columnCount(container)).toBe('2');
        });

        it('drops given columns narrower than the default minColumnWidth', () => {
            setListWidth(450);
            const entries = fiveEntries();

            expect(columnCount(render(propertyTable({entries, columns: 2})).container)).toBe('1');
            expect(
                columnCount(
                    render(propertyTable({entries, columns: 3, labelSide: 'top'})).container
                )
            ).toBe('2');
        });

        it('uses no more of the given columns than it has entries', () => {
            setListWidth(2000);
            const {container} = render(propertyTable({entries: fiveEntries(), columns: 10}));

            expect(columnCount(container)).toBe('5');
        });

        it('uses at least one column when given fewer', () => {
            setListWidth(2000);
            const {container} = render(propertyTable({entries: fiveEntries(), columns: 0}));

            expect(columnCount(container)).toBe('1');
        });

        it('uses fewer than the given columns to keep a given minColumnWidth', () => {
            setListWidth(700);
            const props = {entries: fiveEntries(), columns: 4};

            expect(
                columnCount(render(propertyTable({...props, minColumnWidth: 300})).container)
            ).toBe('2');
            expect(
                columnCount(render(propertyTable({...props, minColumnWidth: 100})).container)
            ).toBe('4');
        });

        it('fits as many columns of the minimum width as the list has room for', () => {
            setListWidth(1000);
            const entries = fiveEntries();

            expect(columnCount(render(propertyTable({entries})).container)).toBe('4');
            expect(
                columnCount(render(propertyTable({entries, minColumnWidth: null})).container)
            ).toBe('4');
            expect(
                columnCount(render(propertyTable({entries, minColumnWidth: 200})).container)
            ).toBe('5');
        });

        it('fits narrower columns when the label is on top', () => {
            setListWidth(480);
            const entries = fiveEntries();

            expect(columnCount(render(propertyTable({entries})).container)).toBe('2');
            expect(columnCount(render(propertyTable({entries, labelSide: 'top'})).container)).toBe(
                '3'
            );
        });

        it('fits no more columns than it has entries', () => {
            setListWidth(2000);
            const {container} = render(
                propertyTable({
                    entries: [
                        {label: 'A', value: 1},
                        {label: 'B', value: 2}
                    ]
                })
            );

            expect(columnCount(container)).toBe('2');
        });

        it('stacks in one column when the list is narrower than a column', () => {
            setListWidth(120);
            const {container} = render(propertyTable({entries: fiveEntries()}));

            expect(columnCount(container)).toBe('1');
        });

        it('fits to the width when columns is null', () => {
            setListWidth(1000);
            const {container} = render(propertyTable({entries: fiveEntries(), columns: null}));

            expect(columnCount(container)).toBe('4');
        });

        it('marks the entries of the last row, so a divider is not drawn under them', () => {
            setListWidth(1000);
            const {container} = render(propertyTable({entries: fiveEntries(), columns: 2})),
                lastRow = entries(container).map(it =>
                    it.classList.contains('xh-property-table__entry--last-row')
                );

            expect(lastRow).toEqual([false, false, false, false, true]);
        });

        it('marks a full last row', () => {
            setListWidth(1000);
            const {container} = render(
                    propertyTable({entries: fiveEntries().slice(0, 4), columns: 2})
                ),
                lastRow = entries(container).map(it =>
                    it.classList.contains('xh-property-table__entry--last-row')
                );

            expect(lastRow).toEqual([false, false, true, true]);
        });
    });
});

//------------------
// Helpers
//------------------
function fiveEntries(): PropertyTableEntry[] {
    return ['A', 'B', 'C', 'D', 'E'].map(label => ({label, value: label}));
}

function texts(container: Element, selector: string): string[] {
    return Array.from(container.querySelectorAll(selector)).map(it => it.textContent);
}

function entries(container: Element): Element[] {
    return Array.from(container.querySelectorAll('.xh-property-table__entry'));
}

function columnCount(container: Element): string {
    return container
        .querySelector<HTMLElement>('.xh-property-table')
        .style.getPropertyValue('--xh-property-table-columns');
}

/** jsdom has no layout, so stand in for the width of the list. */
function setListWidth(width: number) {
    const spy = vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(width);
    onTestFinished(() => spy.mockRestore());
}
