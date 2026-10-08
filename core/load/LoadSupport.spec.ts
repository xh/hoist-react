/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, LoadSpec} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {last} from 'lodash';
import {describe, expect, it, vi} from 'vitest';

/**
 * Managed loading via `loadAsync()`, `refreshAsync()` and `autoRefreshAsync()`, which Hoist
 * installs on every model and service that implements `doLoadAsync()`. Every app load and refresh
 * runs through this code. Apps branch on the LoadSpec it builds - `isStale` to drop outdated
 * results, `isAutoRefresh` to skip background work - and masks bind to its `loadObserver`.
 */
describe('LoadSupport', () => {
    describe('loadAsync', () => {
        it.each([
            ['loadAsync', false, false],
            ['refreshAsync', true, false],
            ['autoRefreshAsync', true, true]
        ] as const)('flags a load started by %s()', (method, isRefresh, isAutoRefresh) => {
            const model = new LoadableModel();
            model[method]();
            expect(model.lastLoad.loadSpec).toMatchObject({isRefresh, isAutoRefresh});
        });

        it('passes meta to doLoadAsync, defaulting to an empty object', () => {
            const model = new LoadableModel();
            model.refreshAsync({forceReload: true});
            expect(model.lastLoad.loadSpec.meta).toEqual({forceReload: true});

            model.loadAsync();
            expect(model.lastLoad.loadSpec.meta).toEqual({});
        });

        it('numbers loads in sequence, from 0 for the first load', () => {
            const model = new LoadableModel();
            model.loadAsync();
            model.refreshAsync();
            model.loadAsync();

            const specs = model.loads.map(it => it.loadSpec);
            expect(specs.map(it => it.loadNumber)).toEqual([0, 1, 2]);
            expect(specs.map(it => it.isFirstLoad)).toEqual([true, false, false]);
        });

        it('passes the flags and meta of a parent load on to a nested load', async () => {
            // The documented pattern for an AppModel that refreshes services in its doLoadAsync().
            const appModel = new LoadableModel(),
                service = new LoadableModel();
            appModel.loadAsync();
            appModel.lastLoad.resolve();
            await wait();

            appModel.autoRefreshAsync({source: 'timer'});
            const parentSpec = appModel.lastLoad.loadSpec;
            service.loadAsync(parentSpec);

            const nestedSpec = service.lastLoad.loadSpec;
            expect(nestedSpec).not.toBe(parentSpec);
            expect(nestedSpec).toMatchObject({
                isRefresh: true,
                isAutoRefresh: true,
                meta: {source: 'timer'},
                loadNumber: 0
            });
        });

        it('ignores an invalid argument and loads with a default spec', () => {
            // A reaction wired as `run: this.loadAsync` passes its tracked value here. Hoist logs
            // the mistake rather than throwing, since v86 (b6a3f1b9e).
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {}),
                model = new LoadableModel();

            model.loadAsync('closedOrders' as any);

            expect(model.lastLoad.loadSpec).toMatchObject({isRefresh: false, meta: {}});
            expect(consoleError).toHaveBeenCalledOnce();
        });
    });

    describe('isStale and isObsolete', () => {
        it('marks a load stale as soon as a newer load starts', () => {
            const model = new LoadableModel();
            model.loadAsync();
            const first = model.lastLoad.loadSpec;
            expect(first.isStale).toBe(false);

            model.refreshAsync();
            expect(first.isStale).toBe(true);
            expect(model.lastLoad.loadSpec.isStale).toBe(false);
        });

        it('marks a load obsolete only once a newer load succeeds', async () => {
            muteConsoleErrors();
            const model = new LoadableModel();
            model.loadAsync();
            model.loadAsync().catch(() => {});
            model.loadAsync();
            const [first, failed, succeeded] = model.loads;

            failed.reject(new Error('Server unavailable'));
            await wait();
            expect(first.loadSpec.isObsolete).toBe(false);

            succeeded.resolve();
            await wait();
            expect(first.loadSpec.isObsolete).toBe(true);
            expect(failed.loadSpec.isObsolete).toBe(true);
        });
    });

    describe('loadObserver', () => {
        it('is pending while a user load runs, but not for an auto-refresh', async () => {
            // Background refreshes must not mask the UI.
            const model = new LoadableModel();
            model.autoRefreshAsync();
            expect(model.loads).toHaveLength(1);
            expect(model.loadObserver.isPending).toBe(false);

            model.refreshAsync();
            expect(model.loadObserver.isPending).toBe(true);

            model.lastLoad.resolve();
            await wait();
            expect(model.loadObserver.isPending).toBe(false);
        });
    });

    describe('autoRefreshAsync', () => {
        it('skips an auto-refresh while a user load is pending', async () => {
            const model = new LoadableModel();
            model.loadAsync();

            await model.autoRefreshAsync();
            expect(model.loads).toHaveLength(1);
        });
    });

    describe('load status', () => {
        it('records a failed load, and routes its exception to handleLoadException', async () => {
            const model = new LoadableModel(),
                handler = vi.spyOn(model, 'handleLoadException').mockImplementation(() => {}),
                error = new Error('Server unavailable'),
                load = model.loadAsync();

            model.lastLoad.reject(error);

            await expect(load).resolves.toBeUndefined();
            expect(handler).toHaveBeenCalledWith(error, model.lastLoad.loadSpec);
            expect(model.lastLoadException).toBe(error);
            expect(model.lastLoadCompleted).toBeInstanceOf(Date);
        });

        it('clears the last exception once a load succeeds', async () => {
            muteConsoleErrors();
            const model = new LoadableModel(),
                failed = model.loadAsync().catch(() => {});
            model.lastLoad.reject(new Error('Server unavailable'));
            await failed;

            const succeeded = model.loadAsync();
            model.lastLoad.resolve();
            await succeeded;
            expect(model.lastLoadException).toBeNull();
        });

        it('records when the latest load was requested and completed', async () => {
            // AutoRefreshService reads both to detect a pending load and to time the next refresh.
            vi.useFakeTimers({toFake: ['Date']});
            vi.setSystemTime(new Date('2026-03-02T09:00:00'));
            const model = new LoadableModel(),
                load = model.loadAsync();
            expect(model.lastLoadRequested).toEqual(new Date('2026-03-02T09:00:00'));
            expect(model.lastLoadCompleted).toBeNull();

            vi.setSystemTime(new Date('2026-03-02T09:00:05'));
            model.lastLoad.resolve();
            await load;
            expect(model.lastLoadCompleted).toEqual(new Date('2026-03-02T09:00:05'));
        });
    });
});

//------------------
// Helpers
//------------------
interface PendingLoad {
    loadSpec: LoadSpec;
    resolve: () => void;
    reject: (e: unknown) => void;
}

/** A model that records each load, and holds it open until the test settles it. */
class LoadableModel extends HoistModel {
    loads: PendingLoad[] = [];

    get lastLoad(): PendingLoad {
        return last(this.loads);
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        return new Promise<void>((resolve, reject) => {
            this.loads.push({loadSpec, resolve, reject});
        });
    }
}

/** Silence the error Hoist logs for each failed load. */
function muteConsoleErrors() {
    vi.spyOn(console, 'error').mockImplementation(() => {});
}
