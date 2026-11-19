/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type ColumnGroupSpec, GridModel} from '@xh/hoist/cmp/grid';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

describe('ColumnGroup.chooserName', () => {
    beforeAll(() => initTestAppAsync());

    it('uses an explicit chooserName', () => {
        const group = createGroup({groupId: 'g1', headerName: () => 'Dynamic', chooserName: 'Pnl'});
        expect(group.chooserName).toBe('Pnl');
    });

    it('defaults to a string headerName', () => {
        expect(createGroup({groupId: 'g1', headerName: 'Trade Info'}).chooserName).toBe(
            'Trade Info'
        );
    });

    it('defaults to a display name derived from groupId when headerName is not a string', () => {
        const group = createGroup({groupId: 'tradeInfo', headerName: () => 'Dynamic'});
        expect(group.chooserName).toBe('Trade Info');
    });
});

function createGroup(spec: Omit<ColumnGroupSpec, 'children'>) {
    const gridModel = new GridModel({columns: [{...spec, children: [{field: 'name'}]}]});
    onTestFinished(() => gridModel.destroy());
    return gridModel.getColumnGroup(spec.groupId);
}
