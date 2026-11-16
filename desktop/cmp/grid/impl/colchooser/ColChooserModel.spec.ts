/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import {XH} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';
import type {ColChooserModel} from './ColChooserModel';
import type {ModalColChooserModel} from './ModalColChooserModel';

/**
 * Desktop column chooser lifecycle. Every GridModel configured with a chooser owns one, so a layout
 * of many grids holds many choosers the user never opens. Each one's bucket grids are GridModels
 * with Stores of their own, so the chooser must build them only when first shown and sync them to
 * the target grid only while shown.
 */
describe('ColChooserModel', () => {
    beforeAll(() => initTestAppAsync());

    describe.each<[string, GridConfig['colChooserModel'], (m: ColChooserModel) => void]>([
        ['dialog', true, m => m.open()],
        ['popover', true, m => (m as ModalColChooserModel).openPopover()],
        ['docked', 'docked', m => m.open()]
    ])('shown as a %s', (_, colChooserModel, show) => {
        it('builds no chooser GridModels until shown', async () => {
            const before = await gridModelCountAsync(),
                gridModel = createGridModel({colChooserModel});
            expect(await gridModelCountAsync()).toBe(before + 1);

            show(chooserOf(gridModel));
            expect(await gridModelCountAsync()).toBe(before + 4);

            gridModel.destroy();
            expect(await gridModelCountAsync()).toBe(before);
        });

        it('does not reload its bucket stores on column changes while closed', () => {
            const gridModel = createGridModel({colChooserModel}),
                chooser = chooserOf(gridModel);
            show(chooser);
            chooser.close();

            const loadSpies = chooser.bucketModels.map(b =>
                vi.spyOn(b.chooserGridModel.store, 'loadData')
            );
            gridModel.updateColumnState([{colId: 'pnl', width: 222}]);
            gridModel.setColumnVisible('region', false);

            loadSpies.forEach(spy => expect(spy).not.toHaveBeenCalled());
        });

        it('shows the current column state when reopened', () => {
            const gridModel = createGridModel({colChooserModel}),
                chooser = chooserOf(gridModel);
            show(chooser);
            chooser.close();

            gridModel.setColumnVisible('region', false);
            gridModel.updateColumnState([{colId: 'pnl', pinned: 'left'}]);
            show(chooser);

            expect(bucketColIds(chooser, 'left')).toEqual(['pnl']);
            expect(bucketColIds(chooser, 'unpinned')).toEqual(['name', 'region']);
            expect(isVisibleInBucket(chooser, 'region')).toBe(false);
        });

        it('syncs its bucket stores with column changes while shown', () => {
            const gridModel = createGridModel({colChooserModel}),
                chooser = chooserOf(gridModel);
            show(chooser);

            gridModel.setColumnVisible('region', false);
            expect(isVisibleInBucket(chooser, 'region')).toBe(false);
        });
    });

    it('builds its Column Library GridModel only when shown', async () => {
        const before = await gridModelCountAsync(),
            gridModel = createGridModel({colChooserModel: {columnLibrary: true}});
        expect(await gridModelCountAsync()).toBe(before + 1);

        chooserOf(gridModel).open();
        expect(await gridModelCountAsync()).toBe(before + 5);
    });

    it('closes without error before it is ever shown', () => {
        const chooser = chooserOf(createGridModel({colChooserModel: true}));
        expect(() => chooser.close()).not.toThrow();
        expect(chooser.unpinnedBucketModel).toBeNull();
    });
});

//------------------
// Helpers
//------------------
function createGridModel(config: Partial<GridConfig> = {}): GridModel {
    const ret = new GridModel({
        columns: [{field: 'name'}, {field: 'region'}, {field: 'pnl'}],
        ...config
    });
    onTestFinished(() => {
        if (!ret.isDestroyed) ret.destroy();
    });
    return ret;
}

function chooserOf(gridModel: GridModel): ColChooserModel {
    return gridModel.colChooserModel as ColChooserModel;
}

/** Count of live GridModels - models register with `XH.getModels()` on the next tick. */
async function gridModelCountAsync(): Promise<number> {
    await wait();
    return XH.getModels(GridModel).length;
}

function bucketOf(chooser: ColChooserModel, bucket: 'left' | 'unpinned' | 'right') {
    return {
        left: chooser.leftBucketModel,
        unpinned: chooser.unpinnedBucketModel,
        right: chooser.rightBucketModel
    }[bucket];
}

function bucketColIds(chooser: ColChooserModel, bucket: 'left' | 'unpinned' | 'right') {
    return bucketOf(chooser, bucket).chooserGridModel.store.records.map(r => r.id);
}

function isVisibleInBucket(chooser: ColChooserModel, colId: string): boolean {
    return chooser.unpinnedBucketModel.chooserGridModel.store.getById(colId).data.visible;
}
