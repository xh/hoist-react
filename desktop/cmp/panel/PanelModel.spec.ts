/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PersistOptions, PlainObject} from '@xh/hoist/core';
import {PanelModel, type PanelConfig} from '@xh/hoist/desktop/cmp/panel';
import {describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * Sizing and collapse state of desktop panels, and its persistence. Nearly every desktop app
 * has resizable or collapsible panels, and their sizes are saved per user - a bad config check or
 * restore resets or breaks a layout the user arranged. Rendering and drag-resizing are left out.
 */
describe('PanelModel', () => {
    describe('constructor', () => {
        it('parses a defaultSize given in pixels as a string', () => {
            const model = createPanel({defaultSize: '250px'});
            expect(model.defaultSize).toBe(250);
            expect(model.size).toBe(250);
        });

        it.each([
            {missing: 'defaultSize', config: {side: 'left'}},
            {missing: 'side', config: {defaultSize: 200}}
        ] as const)('disables sizing and collapsing without a $missing', ({config}) => {
            const error = vi.spyOn(console, 'error').mockImplementation(() => {}),
                model = createPanel({defaultSize: undefined, side: undefined, ...config});

            expect(model.resizable).toBe(false);
            expect(model.collapsible).toBe(false);
            expect(error).toHaveBeenCalled();
        });

        it('drops a maxSize smaller than minSize', () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            const model = createPanel({minSize: 100, maxSize: 50});
            expect(model.maxSize).toBeNull();
        });

        // Fixed in 55.0.2 - a panel resized by dragging needs a splitter, unless it resizes live.
        it.each([
            {desc: 'disables resizing', resizeWhileDragging: false, resizable: false},
            {
                desc: 'allows resizing with resizeWhileDragging',
                resizeWhileDragging: true,
                resizable: true
            }
        ])('$desc without a splitter', ({resizeWhileDragging, resizable}) => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            const model = createPanel({showSplitter: false, resizeWhileDragging});
            expect(model.resizable).toBe(resizable);
        });
    });

    describe('setCollapsed', () => {
        // A user can drag a panel smaller than its collapsed header - expanding must not shrink it.
        it('restores defaultSize when expanding a rendered panel sized below its collapsed size', () => {
            const model = createPanel({defaultSize: 200, defaultCollapsed: true});
            model.size = 10;
            renderAt(model, {offsetWidth: 30});

            model.setCollapsed(false);
            expect(model.collapsed).toBe(false);
            expect(model.size).toBe(200);
        });

        // Fixed in 75.0.0 (f22075388) - expanding before first render reset the panel's size.
        it('keeps the size of a panel expanded before it has rendered', () => {
            const model = createPanel({defaultSize: 200, defaultCollapsed: true});
            model.size = 350;

            model.setCollapsed(false);
            expect(model.size).toBe(350);
        });
    });

    describe('persistence', () => {
        it('restores a saved size and collapsed state', () => {
            const store = new MemoryStore({panel: {size: 320, collapsed: true}}),
                model = createPanel({persistWith: store.options});

            expect(model.size).toBe(320);
            expect(model.collapsed).toBe(true);
        });

        it('writes size and collapsed state as they change', () => {
            const store = new MemoryStore(),
                model = createPanel({persistWith: store.options});

            model.size = 320;
            model.setCollapsed(true);
            expect(store.data).toEqual({panel: {size: 320, collapsed: true}});
        });

        it('saves and restores only the state a panel supports', () => {
            const store = new MemoryStore({panel: {size: 320, collapsed: true}}),
                model = createPanel({resizable: false, persistWith: store.options});
            expect(model.size).toBe(200);
            expect(model.collapsed).toBe(true);

            model.setCollapsed(false);
            expect(store.data).toEqual({});
            model.setCollapsed(true);
            expect(store.data).toEqual({panel: {collapsed: true}});
        });
    });
});

//------------------
// Test support
//------------------
/** A left-side panel, 200px by default, that is resizable and collapsible unless configured. */
function createPanel(config: PanelConfig = {}): PanelModel {
    const ret = new PanelModel({side: 'left', defaultSize: 200, ...config});
    onTestFinished(() => ret.destroy());
    return ret;
}

/** Stand in for a rendered panel element - jsdom has no layout, so sizes are stubbed. */
function renderAt(model: PanelModel, size: {offsetWidth?: number; offsetHeight?: number}) {
    (model._resizeRef as {current: unknown}).current = size;
}

/** In-memory backing store for a model's persistWith, written with no debounce. */
class MemoryStore {
    data: PlainObject;
    readonly setData = vi.fn((data: PlainObject) => (this.data = data));

    constructor(data: PlainObject = {}) {
        this.data = data;
    }

    get options(): PersistOptions {
        return {getData: () => this.data, setData: this.setData, debounce: 0};
    }
}
