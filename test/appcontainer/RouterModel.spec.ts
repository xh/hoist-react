/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {RouterModel} from '@xh/hoist/appcontainer/RouterModel';
import {HoistRoute} from '@xh/hoist/core';
import {describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * RouterModel - Hoist's MobX facade over router5, behind `XH.routerState`, `XH.navigate()`,
 * `XH.appendRoute()` and `XH.popRoute()`. Every routed app registers its routes here and reacts to
 * its observable state, so a break here strands users on the wrong page.
 */
describe('RouterModel', () => {
    describe('addRoutes', () => {
        it('drops routes marked omit at any depth', () => {
            const model = createModel([
                {
                    name: 'default',
                    path: '/app',
                    children: [
                        {name: 'home', path: '/home'},
                        {name: 'admin', path: '/admin', omit: true},
                        {name: 'beta', path: '/beta', omit: () => true}
                    ]
                },
                {name: 'legacy', path: '/legacy', omit: true}
            ]);

            expect(model.hasRoute('default.home')).toBe(true);
            expect(model.hasRoute('default.admin')).toBe(false);
            expect(model.hasRoute('default.beta')).toBe(false);
            expect(model.hasRoute('legacy')).toBe(false);
        });
    });

    describe('currentState', () => {
        it('is observable, updating as the router navigates', () => {
            const model = createModel(),
                names = [];
            model.addReaction({track: () => model.currentState?.name, run: n => names.push(n)});

            model.router.navigate('default.grids', {});
            model.router.navigate('default.grids.detail', {id: 7});

            expect(names).toEqual(['default.grids', 'default.grids.detail']);
            expect(model.currentState.params).toEqual({id: 7});
        });
    });

    describe('appendRoute', () => {
        it('navigates to a child of the current route, merging params', () => {
            const model = createModel();
            model.router.navigate('default.grids', {tab: 'all'});

            model.appendRoute('detail', {id: 7});

            expect(model.currentState.name).toBe('default.grids.detail');
            expect(model.currentState.params).toEqual({tab: 'all', id: 7});
        });
    });

    describe('popRoute', () => {
        it('navigates to the parent of the current route, keeping params', () => {
            const model = createModel();
            model.router.navigate('default.grids.detail', {id: 7});

            model.popRoute();

            expect(model.currentState.name).toBe('default.grids');
            expect(model.currentState.params).toEqual({id: 7});
        });

        it('does nothing at a top-level route', () => {
            const model = createModel(),
                navigate = vi.spyOn(model.router, 'navigate');

            model.popRoute();

            expect(navigate).not.toHaveBeenCalled();
            expect(model.currentState.name).toBe('default');
        });
    });
});

// A started RouterModel, at its 'default' route.
function createModel(
    routes: HoistRoute[] = [
        {
            name: 'default',
            path: '/app',
            children: [
                {
                    name: 'grids',
                    path: '/grids?tab',
                    children: [{name: 'detail', path: '/:id'}]
                }
            ]
        }
    ]
): RouterModel {
    const model = new RouterModel();
    model.addRoutes(routes);
    model.router.setOption('defaultRoute', 'default');
    model.router.start('/app');
    onTestFinished(() => {
        model.router.stop();
        model.destroy();
    });
    return model;
}
