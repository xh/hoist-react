/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistAppModel, HoistModel, LoadSpec, XH} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {initTestAppAsync} from '@xh/hoist/test';
import {last} from 'lodash';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * The app-wide refresh behind `XH.refreshAppAsync()` and auto-refresh. Apps refresh their services
 * in `AppModel.doLoadAsync()`, and rely on that finishing before mounted views refresh, so the
 * views read fresh service data.
 */
describe('RootRefreshContextModel', () => {
    let appModel: RefreshingAppModel;

    beforeAll(async () => {
        await initTestAppAsync({modelClass: RefreshingAppModel});
        appModel = XH.appModel as RefreshingAppModel;
    });

    describe('refreshAsync', () => {
        it('loads the app model before refreshing mounted models', async () => {
            const view = registerView(),
                refresh = XH.refreshAppAsync();
            await wait();
            expect(appModel.lastLoad.loadSpec.isRefresh).toBe(true);
            expect(view.loadSpecs).toHaveLength(0);

            appModel.lastLoad.resolve();
            await refresh;
            expect(view.loadSpecs).toHaveLength(1);
        });

        it('passes the auto-refresh flag to the app model and mounted models', async () => {
            const view = registerView(),
                refresh = XH.refreshContextModel.autoRefreshAsync();
            await wait();
            appModel.lastLoad.resolve();
            await refresh;

            expect(appModel.lastLoad.loadSpec.isAutoRefresh).toBe(true);
            expect(view.loadSpecs[0].isAutoRefresh).toBe(true);
        });
    });
});

//------------------
// Helpers
//------------------
interface PendingLoad {
    loadSpec: LoadSpec;
    resolve: () => void;
}

/** An app model whose loads each wait for the test to settle them. */
class RefreshingAppModel extends HoistAppModel {
    loads: PendingLoad[] = [];

    get lastLoad(): PendingLoad {
        return last(this.loads);
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        return new Promise<void>(resolve => this.loads.push({loadSpec, resolve}));
    }
}

class ViewModel extends HoistModel {
    loadSpecs: LoadSpec[] = [];

    override async doLoadAsync(loadSpec: LoadSpec) {
        this.loadSpecs.push(loadSpec);
    }
}

/** Register a model with the root context, as Hoist does for a model mounted in the app. */
function registerView(): ViewModel {
    const ret = new ViewModel();
    XH.refreshContextModel.register(ret);
    onTestFinished(() => XH.refreshContextModel.unregister(ret));
    return ret;
}
