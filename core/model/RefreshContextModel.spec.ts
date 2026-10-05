/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, LoadSpec, RefreshContextModel} from '@xh/hoist/core';
import {describe, expect, it, vi} from 'vitest';

/**
 * RefreshContextModel, which passes a refresh on to every loadable model mounted beneath it. App
 * refreshes, auto-refreshes and per-tab refreshes all run through it.
 */
describe('RefreshContextModel', () => {
    describe('refreshAsync', () => {
        it('loads each registered target once', async () => {
            const context = new RefreshContextModel(),
                grid = new LoadableModel(),
                chart = new LoadableModel(),
                unmounted = new LoadableModel();
            context.register(grid);
            context.register(grid);
            context.register(chart);
            context.register(unmounted);
            context.unregister(unmounted);

            await context.refreshAsync();

            expect(grid.loadSpecs).toHaveLength(1);
            expect(chart.loadSpecs).toHaveLength(1);
            expect(unmounted.loadSpecs).toHaveLength(0);
        });

        it('passes refresh and auto-refresh flags on to its targets', async () => {
            const context = new RefreshContextModel(),
                grid = new LoadableModel();
            context.register(grid);

            await context.refreshAsync();
            await context.autoRefreshAsync();

            const [refresh, autoRefresh] = grid.loadSpecs;
            expect(refresh).toMatchObject({isRefresh: true, isAutoRefresh: false});
            expect(autoRefresh).toMatchObject({isRefresh: true, isAutoRefresh: true});
        });

        it('refreshes all other targets when one fails, and still resolves', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            const context = new RefreshContextModel(),
                failing = new LoadableModel(),
                grid = new LoadableModel(),
                error = new Error('Server unavailable');
            failing.failWith = error;
            context.register(failing);
            context.register(grid);

            await expect(context.refreshAsync()).resolves.toBeUndefined();

            expect(grid.loadSpecs).toHaveLength(1);
            expect(failing.lastLoadException).toBe(error);
            expect(context.lastLoadException).toBeNull();
        });
    });
});

//------------------
// Helpers
//------------------
class LoadableModel extends HoistModel {
    loadSpecs: LoadSpec[] = [];
    failWith: Error = null;

    override async doLoadAsync(loadSpec: LoadSpec) {
        this.loadSpecs.push(loadSpec);
        if (this.failWith) throw this.failWith;
    }
}
