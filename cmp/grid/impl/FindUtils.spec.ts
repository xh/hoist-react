/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type ColumnSpec, GridModel} from '@xh/hoist/cmp/grid';
import {span} from '@xh/hoist/cmp/layout';
import {type FilterMatchOn, getFilterRegex} from '@xh/hoist/data';
import {dateRenderer, numberRenderer} from '@xh/hoist/format';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';
import {CellTextCache, getCellText, getMatchTextGetters, isHeaderMatch} from './FindUtils';

/**
 * Text matching shared by `StoreFilterField` and `GridFindField` - the text each field of a record
 * matches on per `matchOn`, the text a cell shows, and which columns a query finds by header.
 */
beforeAll(() => initTestAppAsync());

describe('isHeaderMatch', () => {
    const any = (query: string) => getFilterRegex(query, 'any');

    it('matches part of the header text, ignoring case', () => {
        const gridModel = createHeaderGridModel();
        expect(isHeaderMatch(gridModel, 'tradeDate', [], any('date'))).toBe(true);
        expect(isHeaderMatch(gridModel, 'tradeDate', [], any('TRADE D'))).toBe(true);
        expect(isHeaderMatch(gridModel, 'tradeDate', [], any('volume'))).toBe(false);
    });

    it('applies the match mode', () => {
        const gridModel = createHeaderGridModel();
        expect(isHeaderMatch(gridModel, 'tradeDate', [], getFilterRegex('ate', 'startWord'))).toBe(
            false
        );
        expect(isHeaderMatch(gridModel, 'tradeDate', [], getFilterRegex('dat', 'startWord'))).toBe(
            true
        );
    });

    it('matches the text of a header given as a function or an element', () => {
        const gridModel = createHeaderGridModel();
        expect(isHeaderMatch(gridModel, 'pnl', [], any('p&l'))).toBe(true);
        expect(isHeaderMatch(gridModel, 'qty', [], any('quantity'))).toBe(true);
    });

    it('matches every column under a matching column group', () => {
        const gridModel = createHeaderGridModel();
        expect(isHeaderMatch(gridModel, 'q3Rev', ['q3'], any('q3'))).toBe(true);
        expect(isHeaderMatch(gridModel, 'q3Cost', ['q3'], any('q3'))).toBe(true);
        expect(isHeaderMatch(gridModel, 'tradeDate', [], any('q3'))).toBe(false);
    });

    it('matches nothing for an unknown column', () => {
        const gridModel = createHeaderGridModel();
        expect(isHeaderMatch(gridModel, 'missing', [], any('date'))).toBe(false);
    });
});

describe('getCellText', () => {
    it('gives a plain column its raw value, as text', () => {
        expect(cellText({field: 'qty'}, {qty: 1234.5})).toBe('1234.5');
        expect(cellText({field: 'qty'}, {qty: null})).toBe('');
    });

    it('gives the text a renderer shows, stripped of markup', () => {
        expect(cellText({field: 'name', renderer: v => `<b>${v}</b> &amp; co`}, {name: 'a'})).toBe(
            'a & co'
        );
        expect(
            cellText({field: 'qty', renderer: numberRenderer({precision: 2})}, {qty: 1234.5})
        ).toBe('1,234.50');
    });

    it('gives the text a text renderer returns, as it is', () => {
        expect(cellText({field: 'name', textRenderer: v => `<${v}>`}, {name: 'a'})).toBe('<a>');
    });

    it('gives the text of a value from getValueFn', () => {
        expect(
            cellText({colId: 'calc', getValueFn: ({record}) => record.data.qty * 2}, {qty: 2})
        ).toBe('4');
    });

    it('gives the error text a cell shows for a renderer that throws', () => {
        const thrower = () => {
            throw new Error('boom');
        };
        expect(cellText({field: 'name', renderer: thrower}, {name: 'a'})).toBe('#ERROR');
    });

    it('is empty for a renderer that returns nothing, or a getValueFn that throws', () => {
        const thrower = () => {
            throw new Error('boom');
        };
        expect(cellText({field: 'name', renderer: () => null}, {name: 'a'})).toBe('');
        expect(cellText({colId: 'calc', getValueFn: thrower}, {name: 'a'})).toBe('');
    });
});

describe('getMatchTextGetters', () => {
    const qtyCol = {field: 'qty', renderer: numberRenderer({precision: 2})},
        data = {qty: 1234.5, tradeDate: new Date(2026, 0, 15), note: null};

    it.each<{matchOn: FilterMatchOn; texts: string[]}>([
        {matchOn: 'value', texts: ['1234.5']},
        {matchOn: 'rendered', texts: ['1,234.50']},
        {matchOn: 'all', texts: ['1234.5', '1,234.50']}
    ])('reads the raw value, the text shown, or both, per matchOn $matchOn', ({matchOn, texts}) => {
        expect(matchTexts('qty', [qtyCol], data, matchOn)).toEqual(texts);
    });

    it('reads a date as the text shown, in every mode', () => {
        const cols = [{field: 'tradeDate', renderer: dateRenderer()}];
        expect(matchTexts('tradeDate', cols, data, 'value')).toEqual(['2026-01-15']);
        expect(matchTexts('tradeDate', [], data, 'value')).toEqual([]);
    });

    it('reads the raw value without a grid, or without a column for the field', () => {
        expect(matchTexts('qty', [qtyCol], data, 'rendered', false)).toEqual(['1234.5']);
        expect(matchTexts('qty', [], data, 'rendered')).toEqual(['1234.5']);
    });

    it('reads a missing value as empty, so a query of "null" does not match it', () => {
        expect(matchTexts('note', [{field: 'note'}], data, 'value')).toEqual(['']);
    });
});

describe('CellTextCache', () => {
    it('renders once per distinct value of a column', () => {
        let renders = 0;
        const gridModel = createGridModel(
                [{field: 'qty', renderer: v => (renders++, `${v} units`)}],
                ['qty']
            ),
            cache = new CellTextCache(),
            column = gridModel.getLeafColumns()[0];
        gridModel.loadData([
            {id: 1, qty: 5},
            {id: 2, qty: 5},
            {id: 3, qty: 6}
        ]);

        const texts = gridModel.store.records.map(it => cache.getText(column, it));
        gridModel.store.records.forEach(it => cache.getText(column, it));
        expect(texts).toEqual(['5 units', '5 units', '6 units']);
        expect(renders).toBe(2);
    });

    it('renders once per record for a complex renderer, which may read other fields', () => {
        const gridModel = createGridModel(
                [
                    {
                        field: 'qty',
                        rendererIsComplex: true,
                        renderer: (v, {record}) => `${v} ${record.data.unit}`
                    }
                ],
                ['qty', 'unit']
            ),
            cache = new CellTextCache(),
            column = gridModel.getLeafColumns()[0];
        gridModel.loadData([
            {id: 1, qty: 5, unit: 'kg'},
            {id: 2, qty: 5, unit: 'lb'}
        ]);

        expect(gridModel.store.records.map(it => cache.getText(column, it))).toEqual([
            '5 kg',
            '5 lb'
        ]);
    });
});

//------------------
// Helpers
//------------------
function matchTexts(
    field: string,
    columns: ColumnSpec[],
    data: object,
    matchOn: FilterMatchOn,
    withGrid = true
): string[] {
    const gridModel = createGridModel(columns, [
        {name: 'qty', type: 'number'},
        {name: 'tradeDate', type: 'date'},
        'note'
    ]);
    gridModel.loadData([{id: 1, ...data}]);
    const record = gridModel.store.getById(1),
        getters = getMatchTextGetters(
            field,
            gridModel.store,
            withGrid ? gridModel.getLeafColumns().filter(it => it.field === field) : null,
            matchOn,
            new CellTextCache()
        );
    return getters.map(fn => fn(record));
}

function createHeaderGridModel(): GridModel {
    return createGridModel([
        {field: 'tradeDate', headerName: 'Trade Date'},
        {field: 'pnl', headerName: () => span('P&L')},
        {field: 'qty', headerName: span('Quantity')},
        {
            groupId: 'q3',
            headerName: 'Q3 Results',
            children: [
                {field: 'q3Rev', headerName: 'Revenue'},
                {field: 'q3Cost', headerName: 'Cost'}
            ]
        }
    ]);
}

function cellText(spec: ColumnSpec, data: object): string {
    const gridModel = createGridModel([spec], Object.keys(data));
    gridModel.loadData([{id: 1, ...data}]);
    const column = gridModel.getLeafColumns()[0];
    return getCellText(column, gridModel.store.getById(1));
}

function createGridModel(columns: any[], fields: any[] = []): GridModel {
    const ret = new GridModel({columns, store: {fields}});
    onTestFinished(() => ret.destroy());
    return ret;
}
