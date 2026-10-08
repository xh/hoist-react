/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Column, type ColumnSpec, GridModel} from '@xh/hoist/cmp/grid';
import {required} from '@xh/hoist/data';
import {wait} from '@xh/hoist/promise';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render} from '@testing-library/react';
import {createElement} from 'react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * The ag-Grid column definition a Column produces. Grid applies these defs to ag-Grid whenever
 * `GridModel.columns` changes, so the contract below is what keeps those updates cheap.
 */
describe('Column.getAgSpec', () => {
    beforeAll(() => initTestAppAsync());

    describe('component identity', () => {
        it('returns the same renderer, tooltip and editor functions on every call', () => {
            const col = createColumn({
                renderer: v => `${v}!`,
                tooltip: true,
                editor: () => null
            });
            const a = col.getAgSpec(),
                b = col.getAgSpec();

            expect(a.cellRenderer).toBeTypeOf('function');
            expect(a.cellRenderer).toBe(b.cellRenderer);
            expect(a.tooltipComponent).toBe(b.tooltipComponent);
            expect(a.cellEditor).toBe(b.cellEditor);
            expect(a.comparator).toBe(b.comparator);
        });

        it('installs the renderer as the inner renderer of a tree column', () => {
            const gridModel = createGridModel({treeMode: true}, [
                {field: 'name', isTreeColumn: true, renderer: v => v}
            ]);
            const a = gridModel.getColumn('name').getAgSpec(),
                b = gridModel.getColumn('name').getAgSpec();

            expect(a.cellRenderer).toBe('agGroupCellRenderer');
            expect(a.cellRendererParams.innerRenderer).toBeTypeOf('function');
            expect(a.cellRendererParams.innerRenderer).toBe(b.cellRendererParams.innerRenderer);
        });

        it('exposes the same comparator via getAgComparator()', () => {
            const col = createColumn({comparator: (a, b) => a - b});
            expect(col.getAgComparator()).toBe(col.getAgSpec().comparator);
        });
    });

    describe('cellRenderer', () => {
        it('is omitted for a column with no renderer, which ag-Grid renders as plain text', () => {
            const spec = createColumn({}).getAgSpec();
            expect(spec.cellRenderer).toBeUndefined();
            expect(spec.cellClass).toContain('xh-cell--plain');
        });

        it('wraps a configured renderer', () => {
            const spec = createColumn({renderer: v => v}).getAgSpec();
            expect(spec.cellRenderer).toBeTypeOf('function');
            expect(spec.cellClass).not.toContain('xh-cell--plain');
        });

        it('keeps the plain-text marker when agOptions supplies a cellClass', () => {
            expect(createColumn({agOptions: {cellClass: 'a'}}).getAgSpec().cellClass).toEqual([
                'a',
                'xh-cell--plain'
            ]);
            const fn = createColumn({
                agOptions: {cellClass: () => ['b', 'c']}
            }).getAgSpec().cellClass as Function;
            expect(fn({})).toEqual(['b', 'c', 'xh-cell--plain']);
        });

        it('defers to a cellRenderer given via agOptions', () => {
            const spec = createColumn({
                agOptions: {cellRenderer: 'agAnimateShowChangeCellRenderer'}
            }).getAgSpec();
            expect(spec.cellRenderer).toBe('agAnimateShowChangeCellRenderer');
            expect(spec.cellClass).not.toContain('xh-cell--plain');
        });
    });

    describe('cellClass', () => {
        // Columns here have no renderer, so each list ends with the plain-text cell marker.
        it('is a static list when configured with strings, with alignment classes appended', () => {
            expect(createColumn({}).getAgSpec().cellClass).toEqual(['xh-cell--plain']);
            expect(createColumn({cellClass: 'a'}).getAgSpec().cellClass).toEqual([
                'a',
                'xh-cell--plain'
            ]);
            expect(
                createColumn({cellClass: ['a', 'b'], align: 'right'}).getAgSpec().cellClass
            ).toEqual(['a', 'b', 'xh-align-right', 'xh-cell--plain']);
            expect(createColumn({align: 'center'}).getAgSpec().cellClass).toEqual([
                'xh-align-center',
                'xh-cell--plain'
            ]);
            expect(createColumn({align: 'left', renderer: v => v}).getAgSpec().cellClass).toEqual(
                []
            );
        });

        it('wraps a cellClass function, appending alignment classes to its result', () => {
            const col = createColumn({
                    cellClass: v => (v > 0 ? 'pos' : ['neg', 'red']),
                    align: 'right',
                    renderer: v => v
                }),
                fn = col.getAgSpec().cellClass as Function;

            expect(fn({value: 1, data: null})).toEqual(['pos', 'xh-align-right']);
            expect(fn({value: -1, data: null})).toEqual(['neg', 'red', 'xh-align-right']);
        });

        it('marks tree columns', () => {
            const gridModel = createGridModel({treeMode: true}, [
                {field: 'name', isTreeColumn: true}
            ]);
            expect(gridModel.getColumn('name').getAgSpec().cellClass).toEqual(['xh-tree-column']);
        });
    });

    describe('tooltip', () => {
        it('is not configured for a column with neither tooltip nor editor', () => {
            const spec = createColumn({}).getAgSpec();
            expect(spec.tooltip).toBeUndefined();
            expect(spec.tooltipComponent).toBeUndefined();
        });

        it('shows for any record when configured, but not for rows without a record', () => {
            const gridModel = createGridModel({}, [{field: 'name', tooltip: true}]),
                {store} = gridModel;
            store.loadData([{id: 1, name: 'a'}]);
            const tooltip = gridModel.getColumn('name').getAgSpec().tooltip as Function;

            expect(tooltip({data: store.getById(1)})).toBeTruthy();
            expect(tooltip({data: undefined})).toBeNull();
        });

        it('shows for an editable cell only when it has validation results', async () => {
            const gridModel = createGridModel(
                    {store: {fields: [{name: 'name', rules: [required]}]}},
                    [{field: 'name', editor: () => null}]
                ),
                {store} = gridModel;
            store.loadData([
                {id: 1, name: 'ok'},
                {id: 2, name: 'was ok'}
            ]);
            // Stores validate their uncommitted records - so edit one into an invalid state.
            store.modifyRecords({id: 2, name: null});
            await wait();
            await store.validateAsync();
            const tooltip = gridModel.getColumn('name').getAgSpec().tooltip as Function;

            expect(store.getById(2).validationResults.name).not.toHaveLength(0);
            expect(tooltip({data: store.getById(1)})).toBeNull();
            expect(tooltip({data: store.getById(2)})).toBeTruthy();
        });

        it('renders as a plain function component showing the value, or a tooltip fn result', () => {
            const gridModel = createGridModel({}, [
                    {field: 'name', tooltip: true},
                    {field: 'region', tooltip: (v, {record}) => `${v} / ${record.data.name}`},
                    {field: 'pnl', tooltip: () => null}
                ]),
                {store} = gridModel;
            store.loadData([{id: 1, name: 'Alpha', region: 'EMEA', pnl: 10}]);
            const record = store.getById(1),
                renderTooltip = (colId: string) => {
                    const Cmp = gridModel.getColumn(colId).getAgSpec().tooltipComponent;
                    expect(Cmp).toBeTypeOf('function');
                    return render(createElement(Cmp as any, {location: 'cell', data: record}))
                        .container;
                };

            expect(renderTooltip('name').textContent).toBe('Alpha');
            expect(renderTooltip('region').textContent).toBe('EMEA / Alpha');
            // Always renders a node - ag-Grid React waits on a stateless component that does not.
            const empty = renderTooltip('pnl');
            expect(empty.textContent).toBe('');
            expect(empty.childElementCount).toBe(1);
        });
    });

    describe('editable', () => {
        it('is statically false for a column that is not editable', () => {
            expect(createColumn({}).getAgSpec().editable).toBe(false);
            expect(createColumn({editable: false}).getAgSpec().editable).toBe(false);
        });

        it('is evaluated per record for an editable column', () => {
            const gridModel = createGridModel({}, [
                    {field: 'name', editable: ({record}) => record.data.name !== 'locked'}
                ]),
                {store} = gridModel;
            store.loadData([
                {id: 1, name: 'open'},
                {id: 2, name: 'locked'}
            ]);
            const editable = gridModel.getColumn('name').getAgSpec().editable as Function;

            expect(createColumn({editable: true}).getAgSpec().editable).toBeTypeOf('function');
            expect(editable({node: {data: store.getById(1)}})).toBe(true);
            expect(editable({node: {data: store.getById(2)}})).toBe(false);
            expect(editable({node: {data: null}})).toBe(false);
        });
    });
});

function createGridModel(config: object = {}, columns: ColumnSpec[] = [{field: 'name'}]) {
    const ret = new GridModel({columns, ...config});
    onTestFinished(() => ret.destroy());
    return ret;
}

function createColumn(spec: Partial<ColumnSpec>): Column {
    return createGridModel({}, [{field: 'name', ...spec}]).getColumn('name');
}
