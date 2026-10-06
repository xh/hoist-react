/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type TabContainerConfig, TabContainerModel} from '@xh/hoist/cmp/tab';
import {type HoistRoute, XH} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {initTestAppAsync, TestAppModel} from '@xh/hoist/test';
import {beforeAll, beforeEach, describe, expect, it, onTestFinished} from 'vitest';

/**
 * Routed tabs: which tab a route activates, and which route params carry over as users switch
 * tabs. Params declared by the container's route are shared by all its tabs, while a tab's own
 * params belong to that tab and come back when the user returns to it. Mistakes here show the
 * wrong data scope and leave URLs that do not match the screen.
 */
describe('TabContainerModel', () => {
    beforeAll(() => initTestAppAsync({modelClass: RoutedAppModel}));

    beforeEach(() => {
        XH.navigate('home');
    });

    describe('initial tab', () => {
        // v88.0.0 (7d4ae3e81, #4728) - the routed tab was not found beneath a parameterized route.
        it('is the tab named by the current route', () => {
            XH.navigate('app.trades', {region: 'US'});

            const model = create();

            expect(model.activeTabId).toBe('trades');
        });
    });

    describe('setActiveTabId', () => {
        // v88.0.0 (7d4ae3e81, #4728) - a tab's own params were passed on to its siblings.
        it('keeps params of the container route, and drops those of the outgoing tab', async () => {
            const model = await createAtAsync('app.positions', {region: 'US', account: 'A1'});

            model.setActiveTabId('trades');

            expect(XH.routerState.name).toBe('app.trades');
            expect(XH.routerState.params).toEqual({region: 'US'});
            expect(model.activeTabId).toBe('trades');
        });

        it("restores a tab's last route params when switching back to it", async () => {
            const model = await createAtAsync('app.positions', {region: 'US', account: 'A1'});

            model.setActiveTabId('trades');
            model.setActiveTabId('positions');

            expect(XH.routerState.name).toBe('app.positions');
            expect(XH.routerState.params).toEqual({region: 'US', account: 'A1'});
        });

        it('does not restore tab params after a shared param has changed', async () => {
            const model = await createAtAsync('app.positions', {region: 'US', account: 'A1'});

            model.setActiveTabId('trades');
            XH.navigate('app.trades', {region: 'UK'});
            model.setActiveTabId('positions');

            expect(XH.routerState.params).toEqual({region: 'UK'});
        });

        it('does not restore tab params when restoreTabRouteParams is false', async () => {
            const model = await createAtAsync(
                'app.positions',
                {region: 'US', account: 'A1'},
                {restoreTabRouteParams: false}
            );

            model.setActiveTabId('trades');
            model.setActiveTabId('positions');

            expect(XH.routerState.params).toEqual({region: 'US'});
        });
    });

    describe('routing', () => {
        it('activates the tab for each route the app navigates to', async () => {
            const model = await createAtAsync('app.positions', {region: 'US'});

            XH.navigate('app.trades', {region: 'US'});

            expect(model.activeTabId).toBe('trades');
        });
    });
});

//------------------
// Helpers
//------------------
class RoutedAppModel extends TestAppModel {
    override getRoutes(): HoistRoute[] {
        return [
            {name: 'home', path: '/home'},
            {
                name: 'app',
                path: '/app/:region',
                children: [
                    {name: 'positions', path: '/positions?:account'},
                    {name: 'trades', path: '/trades?:account'}
                ]
            }
        ];
    }
}

function create(config: Partial<TabContainerConfig> = {}): TabContainerModel {
    const ret = new TabContainerModel({
        route: 'app',
        tabs: [{id: 'positions'}, {id: 'trades'}],
        ...config
    });
    onTestFinished(() => ret.destroy());
    return ret;
}

/** Navigate to a route, then create a container there and let it sync with the router. */
async function createAtAsync(
    route: string,
    params: Record<string, string>,
    config: Partial<TabContainerConfig> = {}
): Promise<TabContainerModel> {
    XH.navigate(route, params);
    const ret = create(config);
    await wait();
    return ret;
}
