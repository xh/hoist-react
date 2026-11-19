/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {keyValueDisplay} from '@xh/hoist/cmp/keyvaluedisplay';
import type {KeyValueEntry} from '@xh/hoist/cmp/keyvaluedisplay';
import {span} from '@xh/hoist/cmp/layout';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * KeyValueDisplay shows the fields of a record, often from data with gaps. It must render every
 * entry it is given as a label and value pair, and stand a placeholder in for a missing value.
 * Its column count decides which entries end a row.
 */
describe('KeyValueDisplay', () => {
    beforeAll(() => initTestAppAsync());

    it('renders each entry as a term and description, in order', () => {
        const {container} = render(
            keyValueDisplay({
                entries: [
                    {label: 'Symbol', value: 'AAPL'},
                    {label: span('Side'), value: span({className: 'buy', children: 'Buy'})}
                ]
            })
        );
        const list = container.querySelector('dl.xh-key-value-display');

        expect(texts(list, 'dt')).toEqual(['Symbol', 'Side']);
        expect(texts(list, 'dd')).toEqual(['AAPL', 'Buy']);
        expect(list.querySelector('dd .buy')).not.toBeNull();
    });

    it.each([
        ['null', null],
        ['undefined', undefined]
    ])('shows the placeholder for a value that is %s', (_, value) => {
        const {container} = render(keyValueDisplay({entries: [{label: 'Broker', value}]})),
            dd = container.querySelector('dd');

        expect(dd.textContent).toBe('-');
        expect(dd.classList).toContain('xh-key-value-display__value--null');
    });

    it.each([
        ['an empty string', '', ''],
        ['a blank string', '   ', '   '],
        ['true', true, ''],
        ['false', false, '']
    ])('renders a value that is %s as React does, not as the placeholder', (_, value, text) => {
        const {container} = render(keyValueDisplay({entries: [{label: 'Broker', value}]})),
            dd = container.querySelector('dd');

        expect(dd.textContent).toBe(text);
        expect(dd.classList).not.toContain('xh-key-value-display__value--null');
    });

    it('shows zero as a value, not as the placeholder', () => {
        const {container} = render(keyValueDisplay({entries: [{label: 'Fills', value: 0}]})),
            dd = container.querySelector('dd');

        expect(dd.textContent).toBe('0');
        expect(dd.classList).not.toContain('xh-key-value-display__value--null');
    });

    it('shows the default placeholder when nullDisplay is null', () => {
        const {container} = render(
            keyValueDisplay({entries: [{label: 'Broker', value: null}], nullDisplay: null})
        );

        expect(container.querySelector('dd').textContent).toBe('-');
    });

    it.each([false, null, '  '])('renders an entry whose label is %j', label => {
        const {container} = render(keyValueDisplay({entries: [{label, value: 'AAPL'}]}));

        expect(texts(container, 'dt').map(it => it.trim())).toEqual(['']);
        expect(texts(container, 'dd')).toEqual(['AAPL']);
    });

    it('shows a custom nullDisplay', () => {
        const {container} = render(
            keyValueDisplay({entries: [{label: 'Broker', value: null}], nullDisplay: 'None'})
        );

        expect(container.querySelector('dd').textContent).toBe('None');
    });

    it('skips omitted and null entries', () => {
        const {container} = render(
            keyValueDisplay({
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
        expect(render(keyValueDisplay({entries: []})).container.innerHTML).toBe('');
        expect(render(keyValueDisplay({entries: null})).container.innerHTML).toBe('');
        expect(
            render(keyValueDisplay({entries: [{label: 'A', value: 1, omit: true}]})).container
                .innerHTML
        ).toBe('');
    });

    it('shows emptyText in place of an empty list, with layout props and class name', () => {
        const root = render(keyValueDisplay({entries: [], emptyText: 'No trade', width: 200}))
            .container.firstElementChild as HTMLElement;

        expect(root.classList).toContain('xh-key-value-display--empty');
        expect(root.textContent).toBe('No trade');
        expect(root.style.width).toBe('200px');
    });

    it("marks an entry with its intent, and leaves the others' classes alone", () => {
        const {container} = render(
            keyValueDisplay({
                entries: [
                    {label: 'Status', value: 'Rejected', intent: 'danger'},
                    {label: 'Side', value: 'Buy'}
                ]
            })
        );
        const [status, side] = entries(container);

        expect(status.classList).toContain('xh-key-value-display__entry--intent-danger');
        expect(side.className).not.toMatch(/--intent/);
    });

    it('applies layout props and testId to the list', () => {
        const {container} = render(
            keyValueDisplay({
                entries: [{label: 'A', value: 1}],
                maxWidth: 400,
                testId: 'trade-detail'
            })
        );
        const list = container.querySelector<HTMLElement>('.xh-key-value-display');

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
                    render(keyValueDisplay({...props, labelSide})).container.querySelector('dl')
                        .classList
                ).filter(it => it.includes('-align-'));

        expect(alignClasses('left')).toEqual([
            'xh-key-value-display--label-align-right',
            'xh-key-value-display--value-align-right'
        ]);
        expect(alignClasses('top')).toEqual([]);
    });

    it('sets itself at an edge with align, and aligns right by default for align right', () => {
        const entries = [{label: 'A', value: 1}],
            classes = (props = {}) =>
                Array.from(
                    render(keyValueDisplay({entries, ...props})).container.querySelector('dl')
                        .classList
                ).filter(it => it.includes('align'));

        expect(classes({align: 'right'})).toEqual([
            'xh-key-value-display--align-right',
            'xh-key-value-display--label-align-right',
            'xh-key-value-display--value-align-right'
        ]);
        expect(classes({align: 'right', labelAlign: 'left'})).toEqual([
            'xh-key-value-display--align-right',
            'xh-key-value-display--value-align-right'
        ]);
        expect(classes({align: 'left'})).toEqual(['xh-key-value-display--align-left']);
    });

    it('sets its emptyText at the same edge as its entries', () => {
        const {container} = render(
            keyValueDisplay({entries: [], emptyText: 'None', align: 'right'})
        );

        expect(container.firstElementChild.classList).toContain(
            'xh-key-value-display--align-right'
        );
    });

    it('mutes its labels with labelVariant muted', () => {
        const entries = [{label: 'A', value: 1}],
            hasMuted = (props = {}) =>
                render(keyValueDisplay({entries, ...props}))
                    .container.querySelector('dl')
                    .classList.contains('xh-key-value-display--label-muted');

        expect(hasMuted({labelVariant: 'muted'})).toBe(true);
        expect(hasMuted({labelVariant: 'standard'})).toBe(false);
        expect(hasMuted()).toBe(false);
    });

    describe('columns', () => {
        it('uses one column with align, or the given columns whatever its width', () => {
            setListWidth(100);
            const entries = fiveEntries(),
                count = (props: object) =>
                    columnCount(render(keyValueDisplay({entries, ...props})).container);

            expect(count({align: 'right'})).toBe('1');
            expect(count({align: 'left', columns: 3})).toBe('3');
            expect(count({align: 'right', columns: 10})).toBe('5');
        });

        it('uses the given number of columns when the width allows', () => {
            setListWidth(500);
            const {container} = render(keyValueDisplay({entries: fiveEntries(), columns: 2}));

            expect(columnCount(container)).toBe('2');
        });

        it('drops given columns narrower than the default minColumnWidth', () => {
            setListWidth(450);
            const entries = fiveEntries();

            expect(columnCount(render(keyValueDisplay({entries, columns: 2})).container)).toBe('1');
            expect(
                columnCount(
                    render(keyValueDisplay({entries, columns: 3, labelSide: 'top'})).container
                )
            ).toBe('2');
        });

        it('uses no more of the given columns than it has entries', () => {
            setListWidth(2000);
            const {container} = render(keyValueDisplay({entries: fiveEntries(), columns: 10}));

            expect(columnCount(container)).toBe('5');
        });

        it('uses at least one column when given fewer', () => {
            setListWidth(2000);
            const {container} = render(keyValueDisplay({entries: fiveEntries(), columns: 0}));

            expect(columnCount(container)).toBe('1');
        });

        it('uses fewer than the given columns to keep a given minColumnWidth', () => {
            setListWidth(700);
            const props = {entries: fiveEntries(), columns: 4};

            expect(
                columnCount(render(keyValueDisplay({...props, minColumnWidth: 300})).container)
            ).toBe('2');
            expect(
                columnCount(render(keyValueDisplay({...props, minColumnWidth: 100})).container)
            ).toBe('4');
        });

        it('fits as many columns of the minimum width as the list has room for', () => {
            setListWidth(1000);
            const entries = fiveEntries();

            expect(columnCount(render(keyValueDisplay({entries})).container)).toBe('4');
            expect(
                columnCount(render(keyValueDisplay({entries, minColumnWidth: null})).container)
            ).toBe('4');
            expect(
                columnCount(render(keyValueDisplay({entries, minColumnWidth: 200})).container)
            ).toBe('5');
        });

        it('fits narrower columns when the label is on top', () => {
            setListWidth(480);
            const entries = fiveEntries();

            expect(columnCount(render(keyValueDisplay({entries})).container)).toBe('2');
            expect(
                columnCount(render(keyValueDisplay({entries, labelSide: 'top'})).container)
            ).toBe('3');
        });

        it('fits no more columns than it has entries', () => {
            setListWidth(2000);
            const {container} = render(
                keyValueDisplay({
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
            const {container} = render(keyValueDisplay({entries: fiveEntries()}));

            expect(columnCount(container)).toBe('1');
        });

        it('fits to the width when columns is null', () => {
            setListWidth(1000);
            const {container} = render(keyValueDisplay({entries: fiveEntries(), columns: null}));

            expect(columnCount(container)).toBe('4');
        });

        it('marks the entries of the last row, so a divider is not drawn under them', () => {
            setListWidth(1000);
            const {container} = render(keyValueDisplay({entries: fiveEntries(), columns: 2})),
                lastRow = entries(container).map(it =>
                    it.classList.contains('xh-key-value-display__entry--last-row')
                );

            expect(lastRow).toEqual([false, false, false, false, true]);
        });

        it('marks a full last row', () => {
            setListWidth(1000);
            const {container} = render(
                    keyValueDisplay({entries: fiveEntries().slice(0, 4), columns: 2})
                ),
                lastRow = entries(container).map(it =>
                    it.classList.contains('xh-key-value-display__entry--last-row')
                );

            expect(lastRow).toEqual([false, false, true, true]);
        });
    });
});

//------------------
// Helpers
//------------------
function fiveEntries(): KeyValueEntry[] {
    return ['A', 'B', 'C', 'D', 'E'].map(label => ({label, value: label}));
}

function texts(container: Element, selector: string): string[] {
    return Array.from(container.querySelectorAll(selector)).map(it => it.textContent);
}

function entries(container: Element): Element[] {
    return Array.from(container.querySelectorAll('.xh-key-value-display__entry'));
}

function columnCount(container: Element): string {
    return container
        .querySelector<HTMLElement>('.xh-key-value-display')
        .style.getPropertyValue('--xh-key-value-display-columns');
}

/** jsdom has no layout, so stand in for the width of the list. */
function setListWidth(width: number) {
    const spy = vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(width);
    onTestFinished(() => spy.mockRestore());
}
