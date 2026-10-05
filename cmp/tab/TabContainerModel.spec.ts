/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type TabContainerConfig, TabContainerModel} from '@xh/hoist/cmp/tab';
import type {PersistOptions, PlainObject} from '@xh/hoist/core';
import {initTestAppAsync} from '@xh/hoist/test';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * Tab activation, dynamic tabs, and persistence of the active tab, without routing. Nearly every
 * app has a TabContainer. Mistakes here land users on the wrong or a disabled tab, or strand them
 * on a tab that was just removed.
 */
describe('TabContainerModel', () => {
    // Nested containers and dynamic tabs check XH.isMobileApp, which needs a booted app.
    beforeAll(() => initTestAppAsync());

    describe('initial tab', () => {
        it('is the default tab when it is enabled', () => {
            const model = create({tabs: tabs('a', 'b', 'c'), defaultTabId: 'b'});
            expect(model.activeTabId).toBe('b');
        });

        it('is the first enabled tab when the default tab is disabled', () => {
            const model = create({
                tabs: [{id: 'a', disabled: true}, {id: 'b', disabled: true}, {id: 'c'}],
                defaultTabId: 'b'
            });
            expect(model.activeTabId).toBe('c');
        });

        it('skips omitted tabs', () => {
            const model = create({
                tabs: [{id: 'a', omit: true}, {id: 'b', omit: () => true}, {id: 'c'}]
            });
            expect(ids(model)).toEqual(['c']);
            expect(model.activeTabId).toBe('c');
        });
    });

    describe('setActiveTabId', () => {
        it('ignores unknown and disabled tabs', () => {
            const model = create({tabs: [{id: 'a'}, {id: 'b', disabled: true}]});

            model.setActiveTabId('b');
            model.setActiveTabId('unknown');

            expect(model.activeTabId).toBe('a');
        });
    });

    describe('activateNextTab / activatePrevTab', () => {
        it('skips disabled tabs', () => {
            const model = create({tabs: [{id: 'a'}, {id: 'b', disabled: true}, {id: 'c'}]});

            model.activateNextTab();
            expect(model.activeTabId).toBe('c');

            model.activatePrevTab();
            expect(model.activeTabId).toBe('a');
        });

        it('wraps around either end when cycling', () => {
            const model = create({tabs: tabs('a', 'b', 'c')});

            model.activatePrevTab(true);
            expect(model.activeTabId).toBe('c');

            model.activateNextTab(true);
            expect(model.activeTabId).toBe('a');
        });

        it('stays on the last tab when moving forward without cycling', () => {
            const model = create({tabs: tabs('a', 'b', 'c'), defaultTabId: 'c'});

            model.activateNextTab();

            expect(model.activeTabId).toBe('c');
        });

        // BUG: TabContainerModel.ts:375 - from the first tab, `idx - 1` is -1, which lodash
        // findLast() reads as an offset from the end, so the search wraps to the last tab.
        it.fails('stays on the first tab when moving back without cycling', () => {
            const model = create({tabs: tabs('a', 'b', 'c')});

            model.activatePrevTab();

            expect(model.activeTabId).toBe('a');
        });
    });

    describe('addTab', () => {
        it('appends a tab without activating it by default', () => {
            const model = create({tabs: tabs('a', 'b')});

            const added = model.addTab({id: 'c'});

            expect(ids(model)).toEqual(['a', 'b', 'c']);
            expect(model.findTab('c')).toBe(added);
            expect(model.activeTabId).toBe('a');
        });

        it('inserts a tab at an index and activates it on request', () => {
            const model = create({tabs: tabs('a', 'b')});

            model.addTab({id: 'c'}, {index: 1, activateImmediately: true});

            expect(ids(model)).toEqual(['a', 'c', 'b']);
            expect(model.activeTabId).toBe('c');
        });
    });

    describe('removeTab', () => {
        it('returns to the previously active tab when the active tab is removed', () => {
            const model = create({tabs: tabs('a', 'b', 'c')});
            model.setActiveTabId('c');

            model.removeTab('c');

            expect(ids(model)).toEqual(['a', 'b']);
            expect(model.activeTabId).toBe('a');
        });

        it('falls back to the next tab, then the previous one', () => {
            const model = create({tabs: tabs('a', 'b', 'c'), defaultTabId: 'b'});

            model.removeTab('b');
            expect(model.activeTabId).toBe('c');

            model.removeTab('c');
            expect(model.activeTabId).toBe('a');

            model.removeTab('a');
            expect(model.tabs).toEqual([]);
            expect(model.activeTabId).toBeNull();
        });

        it('destroys the removed tab', () => {
            const model = create({tabs: tabs('a', 'b')}),
                tab = model.findTab('b');

            model.removeTab(tab);

            expect(tab.isDestroyed).toBe(true);
            expect(model.findTab('a').isDestroyed).toBe(false);
        });
    });

    describe('setTabs', () => {
        it('keeps the active tab if it remains enabled', () => {
            const model = create({tabs: tabs('a', 'b', 'c')});
            model.setActiveTabId('b');

            model.setTabs([{id: 'b'}, {id: 'd'}]);
            expect(model.activeTabId).toBe('b');

            model.setTabs([{id: 'b', disabled: true}, {id: 'd'}]);
            expect(model.activeTabId).toBe('d');
        });

        it('keeps TabModel instances passed back in, and destroys the others', () => {
            const model = create({tabs: tabs('a', 'b')}),
                [a, b] = model.tabs;

            model.setTabs([a, {id: 'c'}]);

            expect(model.tabs[0]).toBe(a);
            expect(a.isDestroyed).toBe(false);
            expect(b.isDestroyed).toBe(true);
        });
    });

    describe('persistWith', () => {
        it('restores the persisted active tab', () => {
            const store = new MemoryStore({tabContainer: {activeTabId: 'c'}}),
                model = create({tabs: tabs('a', 'b', 'c'), persistWith: store.options});

            expect(model.activeTabId).toBe('c');
        });

        it('persists the active tab as it changes', () => {
            const store = new MemoryStore(),
                model = create({tabs: tabs('a', 'b', 'c'), persistWith: store.options});

            model.setActiveTabId('b');

            expect(store.data).toEqual({tabContainer: {activeTabId: 'b'}});
        });

        it('ignores a persisted tab that was since removed or disabled', () => {
            const config = {tabs: [{id: 'a'}, {id: 'b', disabled: true}], defaultTabId: 'a'},
                removed = new MemoryStore({tabContainer: {activeTabId: 'gone'}}),
                disabled = new MemoryStore({tabContainer: {activeTabId: 'b'}});

            expect(create({...config, persistWith: removed.options}).activeTabId).toBe('a');
            expect(create({...config, persistWith: disabled.options}).activeTabId).toBe('a');
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

function tabs(...ids: string[]) {
    return ids.map(id => ({id}));
}

function ids(model: TabContainerModel): string[] {
    return model.tabs.map(it => it.id);
}

/** In-memory backing store, read and written via a CustomProvider with no write debounce. */
class MemoryStore {
    data: PlainObject;

    constructor(data: PlainObject = {}) {
        this.data = data;
    }

    get options(): PersistOptions {
        return {getData: () => this.data, setData: data => (this.data = data), debounce: 0};
    }
}
