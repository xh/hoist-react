/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, persist, XH} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {hoistCore, initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * A JSON user preference as a backing store, round-tripped through the real PrefService and the
 * fake hoist-core. Most apps persist user state this way, so it roams with the user across
 * devices. Several models often share one preference, each under its own path.
 */
describe('PrefProvider', () => {
    beforeAll(async () => {
        hoistCore.prefs.ordersState = {
            type: 'json',
            defaultValue: {},
            value: {grid: {sortBy: ['date|desc']}, groupBy: 'region'}
        };
        await initTestAppAsync();
    });

    it('restores state from the preference and saves changes, keeping the rest of it', async () => {
        const model = createModel();
        expect(model.groupBy).toBe('region');

        model.groupBy = 'desk';
        await XH.prefService.pushPendingAsync();

        const [req] = hoistCore.requestsTo('xh/setPrefs');
        expect(req.json.ordersState).toEqual({grid: {sortBy: ['date|desc']}, groupBy: 'desk'});
    });
});

class OrdersModel extends HoistModel {
    override persistWith = {prefKey: 'ordersState', debounce: 0};
    @bindable @persist accessor groupBy = 'none';
}

function createModel(): OrdersModel {
    const ret = new OrdersModel();
    onTestFinished(() => ret.destroy());
    return ret;
}
