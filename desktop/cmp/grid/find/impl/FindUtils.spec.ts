/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {span} from '@xh/hoist/cmp/layout';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';
import {isHeaderMatch} from './FindUtils';

/**
 * Column header matching for `GridCellFindField` - which columns a query finds by name.
 */
describe('isHeaderMatch', () => {
    beforeAll(() => initTestAppAsync());

    it('matches part of the header text, ignoring case', () => {
        const gridModel = createGridModel();
        expect(isHeaderMatch(gridModel, 'tradeDate', [], 'date')).toBe(true);
        expect(isHeaderMatch(gridModel, 'tradeDate', [], 'TRADE D')).toBe(true);
        expect(isHeaderMatch(gridModel, 'tradeDate', [], 'volume')).toBe(false);
    });

    it('matches the text of a header given as a function or an element', () => {
        const gridModel = createGridModel();
        expect(isHeaderMatch(gridModel, 'pnl', [], 'p&l')).toBe(true);
        expect(isHeaderMatch(gridModel, 'qty', [], 'quantity')).toBe(true);
    });

    it('matches every column under a matching column group', () => {
        const gridModel = createGridModel();
        expect(isHeaderMatch(gridModel, 'q3Rev', ['q3'], 'q3')).toBe(true);
        expect(isHeaderMatch(gridModel, 'q3Cost', ['q3'], 'q3')).toBe(true);
        expect(isHeaderMatch(gridModel, 'tradeDate', [], 'q3')).toBe(false);
    });

    it('matches nothing for an empty query or an unknown column', () => {
        const gridModel = createGridModel();
        expect(isHeaderMatch(gridModel, 'tradeDate', [], '')).toBe(false);
        expect(isHeaderMatch(gridModel, 'missing', [], 'date')).toBe(false);
    });
});

function createGridModel(): GridModel {
    const ret = new GridModel({
        columns: [
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
        ]
    });
    onTestFinished(() => ret.destroy());
    return ret;
}
