/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, LoadSpec, ManagedRefreshContextModel, RefreshMode} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {describe, expect, it, onTestFinished} from 'vitest';

/**
 * The refresh context behind each tab, dash view, dock view, collapsible panel and mobile page.
 * Its `refreshMode` decides whether content hidden in one of these containers refreshes on
 * request, later when shown, or not at all. A bug here shows up only as stale data in a hidden
 * tab, which is hard to notice by hand.
 */
describe('ManagedRefreshContextModel', () => {
    describe('refreshAsync', () => {
        it.each(['always', 'onShowLazy', 'onShowAlways', 'skipHidden'] as RefreshMode[])(
            'refreshes its targets at once while shown, in "%s" mode',
            async mode => {
                const {context, content} = setup(mode, true);

                await context.refreshAsync();

                expect(content.loadSpecs).toHaveLength(1);
                expect(content.loadSpecs[0].isRefresh).toBe(true);
            }
        );

        it('refreshes hidden targets at once in "always" mode', async () => {
            const {container, context, content} = setup('always');

            await context.refreshAsync();
            expect(content.loadSpecs).toHaveLength(1);

            await showAsync(container);
            expect(content.loadSpecs).toHaveLength(1);
        });

        it('drops a refresh while hidden in "skipHidden" mode', async () => {
            const {container, context, content} = setup('skipHidden');

            await context.refreshAsync();
            await showAsync(container);

            expect(content.loadSpecs).toHaveLength(0);
        });

        it('defers a refresh while hidden until next shown in "onShowLazy" mode', async () => {
            const {container, context, content} = setup('onShowLazy');

            await showAsync(container);
            expect(content.loadSpecs).toHaveLength(0);

            container.isActive = false;
            await context.refreshAsync();
            expect(content.loadSpecs).toHaveLength(0);

            await showAsync(container);
            expect(content.loadSpecs).toHaveLength(1);
            expect(content.loadSpecs[0].isRefresh).toBe(true);

            container.isActive = false;
            await showAsync(container);
            expect(content.loadSpecs).toHaveLength(1);
        });

        it('refreshes each time it is shown in "onShowAlways" mode', async () => {
            const {container, context, content} = setup('onShowAlways');

            await context.refreshAsync();
            expect(content.loadSpecs).toHaveLength(0);

            await showAsync(container);
            expect(content.loadSpecs).toHaveLength(1);

            container.isActive = false;
            await showAsync(container);
            expect(content.loadSpecs).toHaveLength(2);
        });
    });
});

//------------------
// Helpers
//------------------
/** Stand-in for a TabModel or other container that shows and hides its content. */
class ContainerModel extends HoistModel {
    @bindable accessor isActive: boolean;
    refreshMode: RefreshMode;

    constructor(refreshMode: RefreshMode, isActive: boolean) {
        super();
        this.refreshMode = refreshMode;
        this.isActive = isActive;
    }
}

class ContentModel extends HoistModel {
    loadSpecs: LoadSpec[] = [];

    override async doLoadAsync(loadSpec: LoadSpec) {
        this.loadSpecs.push(loadSpec);
    }
}

function setup(refreshMode: RefreshMode, isActive = false) {
    const container = new ContainerModel(refreshMode, isActive),
        context = new ManagedRefreshContextModel(container),
        content = new ContentModel();
    context.register(content);
    onTestFinished(() => {
        context.destroy();
        container.destroy();
    });
    return {container, context, content};
}

/** Show the container, then let any refresh it triggers complete. */
async function showAsync(container: ContainerModel) {
    container.isActive = true;
    await wait();
}
