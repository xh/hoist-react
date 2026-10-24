/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type TabContainerConfig, TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, type LoadSpec} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * A single tab within a TabContainer: disabling, the render and refresh modes it inherits, and
 * content given as a nested container. These drive what a tab shows and when its content loads.
 */
describe('TabModel', () => {
    // Nested containers check XH.isMobileApp, which needs a booted app.
    beforeAll(() => initTestAppAsync());

    describe('setDisabled', () => {
        it('moves the container to another enabled tab when disabling the active tab', () => {
            const model = create({tabs: [{id: 'a'}, {id: 'b', disabled: true}, {id: 'c'}]}),
                a = model.findTab('a');

            a.setDisabled(true);

            expect(a.disabled).toBe(true);
            expect(model.activeTabId).toBe('c');
        });

        it('refuses to disable the last enabled tab', () => {
            const model = create({tabs: [{id: 'a'}, {id: 'b', disabled: true}]}),
                a = model.findTab('a');

            expect(() => a.setDisabled(true)).toThrow('Cannot disable last enabled tab.');
            expect(a.disabled).toBe(false);
            expect(model.activeTabId).toBe('a');
        });
    });

    describe('renderMode / refreshMode', () => {
        it('inherits modes from its container, down through nested containers', () => {
            const model = create({
                    renderMode: 'always',
                    refreshMode: 'onShowAlways',
                    tabs: [
                        {id: 'a', renderMode: 'unmountOnHide', refreshMode: 'skipHidden'},
                        {id: 'b', content: [{id: 'b1'}, {id: 'b2', refreshMode: 'always'}]}
                    ]
                }),
                {childContainerModel} = model.findTab('b'),
                [b1, b2] = childContainerModel.tabs;

            expect(model.findTab('a')).toMatchObject({
                renderMode: 'unmountOnHide',
                refreshMode: 'skipHidden'
            });
            expect(b1).toMatchObject({renderMode: 'always', refreshMode: 'onShowAlways'});
            expect(b2).toMatchObject({renderMode: 'always', refreshMode: 'always'});
        });

        it('refreshes a hidden tab when next shown, if a refresh was requested meanwhile', async () => {
            const model = create({tabs: [{id: 'a'}, {id: 'b'}]}),
                {refreshContextModel} = model.findTab('b'),
                content = new ContentModel();
            onTestFinished(() => content.destroy());
            refreshContextModel.register(content);

            await refreshContextModel.refreshAsync();
            expect(content.loadSpecs).toHaveLength(0);

            model.setActiveTabId('b');
            await wait();
            expect(content.loadSpecs).toHaveLength(1);
            expect(content.loadSpecs[0].isRefresh).toBe(true);
        });
    });

    describe('content', () => {
        it('creates a nested container from a list of tabs or a container config', () => {
            const model = create({
                    tabs: [
                        {id: 'a', content: [{id: 'a1'}, {id: 'a2'}]},
                        {id: 'b', content: {tabs: [{id: 'b1'}, {id: 'b2'}], defaultTabId: 'b2'}}
                    ]
                }),
                a = model.findTab('a').childContainerModel,
                b = model.findTab('b').childContainerModel;

            expect(a.depth).toBe(1);
            expect(a.tabs.map(it => it.id)).toEqual(['a1', 'a2']);
            expect(b.activeTabId).toBe('b2');
        });

        // v77.1.1 (9b403f9f7) - null content, for tabs whose content is supplied later.
        it('accepts null content', () => {
            const model = create({tabs: [{id: 'a', content: null}]});
            expect(model.findTab('a').content).toBeNull();
        });
    });
});

//------------------
// Helpers
//------------------
function create(config: TabContainerConfig): TabContainerModel {
    const ret = new TabContainerModel(config);
    onTestFinished(() => ret.destroy());
    return ret;
}

class ContentModel extends HoistModel {
    loadSpecs: LoadSpec[] = [];

    override async doLoadAsync(loadSpec: LoadSpec) {
        this.loadSpecs.push(loadSpec);
    }
}
