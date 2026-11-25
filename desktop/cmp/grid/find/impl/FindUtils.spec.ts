/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type ColumnSpec, GridModel} from '@xh/hoist/cmp/grid';
import {span} from '@xh/hoist/cmp/layout';
import {getFilterRegex} from '@xh/hoist/data';
import {numberRenderer} from '@xh/hoist/format';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';
import {getCellText, isHeaderMatch} from './FindUtils';

/**
 * Text matching for `GridFindField` in `cells` mode - which columns a query finds by header, and
 * the text a cell is searched by, which must be what the cell shows.
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

//------------------
// Helpers
//------------------
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

function createGridModel(columns: any[], fields: string[] = []): GridModel {
    const ret = new GridModel({columns, store: {fields}});
    onTestFinished(() => ret.destroy());
    return ret;
}
