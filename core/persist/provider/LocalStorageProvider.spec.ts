/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, persist} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, beforeEach, describe, expect, it, onTestFinished} from 'vitest';

/**
 * Browser localStorage as a backing store, via the real LocalStorageService. The storage key format
 * is a compatibility contract: if it changes, every user silently loses their saved state. Keys
 * are namespaced by app code and username, so users sharing a browser keep separate state.
 */
describe('LocalStorageProvider', () => {
    beforeAll(() => initTestAppAsync());

    beforeEach(() => localStorage.clear());

    it('writes state as JSON under a key namespaced by app code and username', () => {
        const model = createModel();
        model.showAdvanced = true;

        expect(localStorage.getItem('testApp.jdoe.ordersPanel')).toBe('{"showAdvanced":true}');
    });

    it('restores state saved by an earlier session', () => {
        localStorage.setItem('testApp.jdoe.ordersPanel', '{"showAdvanced":true}');

        expect(createModel().showAdvanced).toBe(true);
    });
});

class OrdersPanelModel extends HoistModel {
    override persistWith = {localStorageKey: 'ordersPanel', debounce: 0};
    @bindable @persist accessor showAdvanced = false;
}

function createModel(): OrdersPanelModel {
    const ret = new OrdersPanelModel();
    onTestFinished(() => ret.destroy());
    return ret;
}
