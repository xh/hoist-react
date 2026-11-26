/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid, type GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import {vbox} from '@xh/hoist/cmp/layout';
import type {PlainObject} from '@xh/hoist/core';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {installAgGridForTests} from '@xh/hoist/test-support/agGrid';
import {act, fireEvent, render, waitFor} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';
import {gridFindField, type GridFindFieldProps} from './GridFindField';

/**
 * `GridFindField` finds matching rows and selects them, or with `mode: 'cells'`, finds matching
 * column headers and cells and moves between them as Excel's Find does. These tests pin down the
 * order of matches, where each step starts from, and that `cells` mode leaves selection alone.
 */
describe('GridFindField', () => {
    beforeAll(async () => {
        await initTestAppAsync();
        installAgGridForTests();
    });

    describe('cells mode', () => {
        it('finds matching headers first, then cells row by row, left to right', async () => {
            const {gridModel, find} = await renderAsync();

            await find.typeAsync('a');
            expect(find.countLabel()).toBe('1/6');
            expect(gridModel._findActiveHeader).toBe('name');

            const order = [];
            for (let i = 0; i < 6; i++) {
                order.push(activeMatch(gridModel));
                find.press('Enter');
            }
            expect(order).toEqual([
                'header:name',
                '1:name', // Alpha
                '1:city', // Paris
                '2:name', // Beta
                '3:name', // Gamma
                '3:city' // Madrid
            ]);
        });

        it('skips headers unless includeHeaders is set', async () => {
            const {gridModel, find} = await renderAsync({}, {includeHeaders: false});

            await find.typeAsync('a');
            expect(find.countLabel()).toBe('1/5');
            expect(activeMatch(gridModel)).toBe('1:name');
        });

        it('wraps at either end, stepping back with Shift+Enter', async () => {
            const {gridModel, find} = await renderAsync();

            await find.typeAsync('a');
            expect(activeMatch(gridModel)).toBe('header:name');

            find.press('Enter', {shiftKey: true});
            expect(activeMatch(gridModel)).toBe('3:city');
            expect(find.countLabel()).toBe('6/6');
            find.press('Enter');
            expect(activeMatch(gridModel)).toBe('header:name');
        });

        it('steps from the cell the user last focused', async () => {
            const {gridModel, find} = await renderAsync();

            await find.typeAsync('a');
            act(() => gridModel.agApi.setFocusedCell(1, 'qty')); // Beta's qty cell
            find.press('Enter');
            expect(activeMatch(gridModel)).toBe('3:name');

            find.press('Enter');
            expect(activeMatch(gridModel)).toBe('3:city');
        });

        it('starts a new query from the focused cell, including that cell', async () => {
            const {gridModel, find} = await renderAsync();

            act(() => gridModel.agApi.setFocusedCell(1, 'name')); // Beta
            await find.typeAsync('a');
            expect(activeMatch(gridModel)).toBe('2:name');
        });

        it('stays on the active match while the query is refined', async () => {
            const {gridModel, find} = await renderAsync();

            await find.typeAsync('a');
            find.press('Enter');
            find.press('Enter');
            expect(activeMatch(gridModel)).toBe('1:city');

            await find.typeAsync('ar');
            expect(activeMatch(gridModel)).toBe('1:city');
        });

        it('outlines the active match, cell or header, and nothing else', async () => {
            const {container, find} = await renderAsync();

            await find.typeAsync('a');
            await waitFor(() =>
                expect(
                    container.querySelector('.ag-header-cell.xh-column-header--find-active')
                        ?.textContent
                ).toBe('Name')
            );
            expect(cellsWithClass(container, 'xh-cell--find-active')).toEqual([]);

            find.press('Enter');
            await waitFor(() =>
                expect(cellsWithClass(container, 'xh-cell--find-active')).toEqual(['Alpha'])
            );
            expect(container.querySelector('.xh-column-header--find-active')).toBeNull();
        });

        it('matches the text a renderer shows', async () => {
            const {gridModel, find} = await renderAsync({
                columns: [
                    {field: 'name'},
                    {field: 'qty', renderer: v => `<b>${v.toLocaleString()}</b>`}
                ]
            });

            await find.typeAsync('1,234');
            expect(find.countLabel()).toBe('1/1');
            expect(activeMatch(gridModel)).toBe('2:qty');
        });

        it('searches only the store fields of visible columns, as rows mode does', async () => {
            const {find} = await renderAsync({
                columns: [
                    {field: 'name', headerName: 'Name'},
                    {colId: 'town', headerName: 'Town', getValueFn: () => 'Townsville'}
                ]
            });

            await find.typeAsync('town');
            expect(find.countLabel()).toBe('0/0');
        });

        it('searches only the columns for includeFields', async () => {
            const {gridModel, find} = await renderAsync({}, {includeFields: ['city']});

            await find.typeAsync('a');
            expect(find.countLabel()).toBe('1/2');
            expect(activeMatch(gridModel)).toBe('1:city');
        });

        it('selects the row of each cell match, leaving it on a header match', async () => {
            const {gridModel, find} = await renderAsync({selModel: 'single'});
            gridModel.selectAsync(2);
            await waitFor(() => expect(gridModel.selectedId).toBe(2));

            await find.typeAsync('a');
            expect(activeMatch(gridModel)).toBe('2:name');
            expect(gridModel.selectedId).toBe(2);

            find.press('Enter');
            await waitFor(() => expect(gridModel.selectedId).toBe(3));

            find.press('Enter', {shiftKey: true});
            find.press('Enter', {shiftKey: true});
            find.press('Enter', {shiftKey: true});
            expect(activeMatch(gridModel)).toBe('1:name');
            await waitFor(() => expect(gridModel.selectedId).toBe(1));

            find.press('Enter', {shiftKey: true});
            expect(activeMatch(gridModel)).toBe('header:name');
            expect(gridModel.selectedId).toBe(1);
        });

        it('steps between cells in a grid without selection', async () => {
            const {gridModel, find} = await renderAsync({selModel: 'disabled'});

            await find.typeAsync('a');
            find.press('Enter');
            expect(activeMatch(gridModel)).toBe('1:name');
            expect(gridModel.selectedId).toBeNull();
        });

        it('finds cells in a collapsed column group, expanding it to show the match', async () => {
            const {gridModel, find} = await renderAsync({
                columns: [
                    {field: 'name', headerName: 'Name'},
                    {
                        groupId: 'details',
                        collapsed: true,
                        children: [
                            {field: 'qty', groupShowMode: 'collapsed'},
                            {field: 'city', groupShowMode: 'expanded'}
                        ]
                    }
                ]
            });
            expect(displayedColIds(gridModel)).toEqual(['name', 'qty']);

            await find.typeAsync('madrid');
            expect(find.countLabel()).toBe('1/1');
            expect(activeMatch(gridModel)).toBe('3:city');
            expect(gridModel.isColumnGroupExpanded('details')).toBe(true);
            expect(displayedColIds(gridModel)).toEqual(['name', 'city']);

            // A column shown only while its group is collapsed collapses the group again.
            await find.typeAsync('1234');
            expect(activeMatch(gridModel)).toBe('2:qty');
            expect(gridModel.isColumnGroupExpanded('details')).toBe(false);
        });

        it('keeps the active match as data updates, and drops matches no longer found', async () => {
            const {gridModel, find} = await renderAsync();

            await find.typeAsync('a');
            find.press('Enter');
            find.press('Enter');
            expect(activeMatch(gridModel)).toBe('1:city');

            act(() => gridModel.store.modifyRecords({id: 3, name: 'Delta'}));
            await waitFor(() => expect(find.countLabel()).toBe('3/6'));
            expect(activeMatch(gridModel)).toBe('1:city');

            act(() => gridModel.store.modifyRecords({id: 1, city: 'Oslo'}));
            await waitFor(() => expect(find.countLabel()).toBe('0/5'));
            expect(gridModel._findActiveCell).toBeNull();
        });

        it('clears the search on Esc, and focuses the matched cell', async () => {
            const {gridModel, find} = await renderAsync();

            await find.typeAsync('beta');
            find.press('Escape');

            await waitFor(() => expect(find.input.value).toBe(''));
            expect(gridModel._findActiveCell).toBeNull();
            expect(gridModel.agApi.getFocusedCell()).toMatchObject({rowIndex: 1});
            expect(gridModel.agApi.getFocusedCell().column.getColId()).toBe('name');
        });
    });

    describe('rows mode', () => {
        it('selects the first matching record by default', async () => {
            const {gridModel, find} = await renderAsync({selModel: 'single'}, {mode: undefined});

            await find.typeAsync('gam');
            await waitFor(() => expect(gridModel.selectedId).toBe(3));
            expect(gridModel._findActiveCell).toBeNull();
        });

        it('matches columns in a collapsed column group', async () => {
            const {gridModel, find} = await renderAsync(
                {
                    selModel: 'single',
                    columns: [
                        {field: 'name'},
                        {
                            groupId: 'details',
                            collapsed: true,
                            children: [
                                {field: 'qty', groupShowMode: 'collapsed'},
                                {field: 'city', groupShowMode: 'expanded'}
                            ]
                        }
                    ]
                },
                {mode: undefined}
            );

            await find.typeAsync('madrid');
            await waitFor(() => expect(gridModel.selectedId).toBe(3));
        });
    });

    describe('step buttons', () => {
        it('never take focus, so the input keeps it and its keys keep working', async () => {
            const {container, find} = await renderAsync();
            await find.typeAsync('a');

            const buttons = container.querySelectorAll('.xh-grid-find-field__controls button');
            expect(buttons).toHaveLength(2);
            buttons.forEach(it => {
                expect(it.getAttribute('tabindex')).toBe('-1');
                expect(fireEvent.mouseDown(it)).toBe(false); // default, which moves focus, prevented
            });
        });
    });
});

//------------------------
// Helpers
//------------------------
const DATA: PlainObject[] = [
    {id: 1, name: 'Alpha', qty: 10, city: 'Paris'},
    {id: 2, name: 'Beta', qty: 1234, city: 'Oslo'},
    {id: 3, name: 'Gamma', qty: 7, city: 'Madrid'}
];

async function renderAsync(config: GridConfig = {}, findProps: GridFindFieldProps = {}) {
    const gridModel = new GridModel({
        columns: [
            {field: 'name', headerName: 'Name'},
            {field: 'qty', headerName: 'Qty'},
            {field: 'city', headerName: 'City'}
        ],
        ...config
    });
    onTestFinished(() => gridModel.destroy());
    gridModel.loadData(DATA);

    const {container} = render(
        vbox({
            width: 600,
            height: 400,
            children: [
                // Most tests check where header matches fall, so turn them on by default.
                gridFindField({
                    gridModel,
                    mode: 'cells',
                    includeHeaders: true,
                    queryBuffer: 0,
                    ...findProps
                }),
                grid({model: gridModel, flex: 1})
            ]
        })
    );
    await waitFor(() => expect(container.querySelectorAll('.ag-row')).toHaveLength(3));

    const input = container.querySelector('.xh-grid-find-field input') as HTMLInputElement,
        find = {
            input,
            countLabel: () =>
                container.querySelector('.xh-grid-find-field__count-label')?.textContent ?? null,
            press: (key: string, opts: KeyboardEventInit = {}) =>
                act(() => {
                    fireEvent.keyDown(input, {key, ...opts});
                }),
            typeAsync: async (value: string) => {
                fireEvent.change(input, {target: {value}});
                await waitFor(() =>
                    expect(
                        container.querySelector('.xh-grid-find-field__count-label')
                    ).not.toBeNull()
                );
                // Let the buffered search run.
                await act(() => new Promise(resolve => setTimeout(resolve, 10)));
            }
        };
    return {gridModel, container, find};
}

// The active match as `header:colId`, or `recordId:colId` for a cell.
function activeMatch(gridModel: GridModel): string {
    const header = gridModel._findActiveHeader,
        cell = gridModel._findActiveCell;
    if (header) return `header:${header}`;
    return cell ? `${cell.recordId}:${cell.colId}` : null;
}

function displayedColIds(gridModel: GridModel): string[] {
    return gridModel.agApi.getAllDisplayedColumns().map(it => it.getColId());
}

function cellsWithClass(container: HTMLElement, className: string): string[] {
    return Array.from(container.querySelectorAll(`.ag-cell.${className}`)).map(
        it => it.textContent
    );
}
