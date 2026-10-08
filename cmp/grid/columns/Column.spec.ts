/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Column, type ColumnSpec, GridModel} from '@xh/hoist/cmp/grid';
import {initTestAppAsync} from '@xh/hoist/test-support';
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

    describe('cellClass', () => {
        it('is a static list when configured with strings, with alignment classes appended', () => {
            expect(createColumn({}).getAgSpec().cellClass).toEqual([]);
            expect(createColumn({cellClass: 'a'}).getAgSpec().cellClass).toEqual(['a']);
            expect(
                createColumn({cellClass: ['a', 'b'], align: 'right'}).getAgSpec().cellClass
            ).toEqual(['a', 'b', 'xh-align-right']);
            expect(createColumn({align: 'center'}).getAgSpec().cellClass).toEqual([
                'xh-align-center'
            ]);
            expect(createColumn({align: 'left'}).getAgSpec().cellClass).toEqual([]);
        });

        it('wraps a cellClass function, appending alignment classes to its result', () => {
            const col = createColumn({
                    cellClass: v => (v > 0 ? 'pos' : ['neg', 'red']),
                    align: 'right'
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
