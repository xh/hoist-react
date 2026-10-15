/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    HoistModel,
    type Persistable,
    PersistableState,
    PersistenceProvider,
    type PersistenceProviderConfig,
    type PersistOptions,
    type PlainObject
} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * The PersistenceProvider lifecycle shared by every backing store: read and apply stored state,
 * then debounce writes, clear state that returns to its default, and fail gently on bad config.
 * Every persisted grid, panel, tab container, chooser and `@persist` field runs on this engine,
 * and a break here loses user state without any visible error.
 *
 * Tests use a CustomProvider over an in-memory store, so they exercise the base class directly.
 */
describe('PersistenceProvider', () => {
    describe('create', () => {
        it('applies stored state to its target without writing it back', () => {
            const store = new MemoryStore({layout: {size: 300}}),
                model = createModel({...store.options, debounce: 0});

            expect(model.size).toBe(300);
            expect(store.setData).not.toHaveBeenCalled();
        });

        it('accepts an app-defined PersistenceProvider subclass as its type', () => {
            const holder = {state: {layout: {size: 300}}},
                model = createModel({type: HolderProvider, holder, debounce: 0} as PersistOptions);

            expect(model.provider).toBeInstanceOf(HolderProvider);
            expect(model.size).toBe(300);

            model.size = 400;
            expect(holder.state).toEqual({layout: {size: 400}});
        });

        // Persistence must never block an app - a bad config leaves the model on its defaults.
        it.each<[string, PersistOptions]>([
            ['no provider is configured', {}],
            ['the store holds an array, not an object', {getData: () => [], setData: () => {}}],
            [
                'the store fails on read',
                {
                    getData: () => {
                        throw new Error('Store unavailable');
                    },
                    setData: () => {}
                }
            ]
        ])('logs an error and returns null when %s', (_, persistWith) => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {}),
                model = createModel(persistWith);

            expect(model.provider).toBeNull();
            expect(model.size).toBe(100);
            expect(consoleError).toHaveBeenCalled();
        });
    });

    describe('write', () => {
        it('debounces writes by 250ms by default', async () => {
            vi.useFakeTimers();
            const store = new MemoryStore(),
                model = createModel(store.options);

            model.size = 200;
            model.size = 300;
            model.size = 400;
            await vi.advanceTimersByTimeAsync(249);
            expect(store.setData).not.toHaveBeenCalled();

            await vi.advanceTimersByTimeAsync(1);
            expect(store.setData).toHaveBeenCalledOnce();
            expect(store.data).toEqual({layout: {size: 400}});
        });

        it('writes to its own path in a store shared with other state', () => {
            const store = new MemoryStore({grids: {detail: {size: 250}}, theme: 'dark'}),
                main = createModel({...store.options, path: 'grids.main', debounce: 0}),
                detail = createModel({...store.options, path: 'grids.detail', debounce: 0});

            expect(detail.size).toBe(250);

            main.size = 300;
            expect(store.data).toEqual({
                grids: {main: {size: 300}, detail: {size: 250}},
                theme: 'dark'
            });
        });
    });

    describe('clear', () => {
        it('removes stored state, and parents left empty, when its target returns to default', () => {
            const store = new MemoryStore({
                    grids: {main: {size: 300}, detail: {size: 250}},
                    theme: 'dark'
                }),
                main = createModel({...store.options, path: 'grids.main', debounce: 0}),
                detail = createModel({...store.options, path: 'grids.detail', debounce: 0});

            main.size = 100;
            expect(store.data).toEqual({grids: {detail: {size: 250}}, theme: 'dark'});

            detail.size = 100;
            expect(store.data).toEqual({theme: 'dark'});
        });

        // Fixed in 88.0.0 (7c7eff577) - the pending write landed after the clear.
        it('cancels a pending write so it cannot resurrect cleared state', async () => {
            vi.useFakeTimers();
            const store = new MemoryStore(),
                model = createModel(store.options);

            model.size = 300;
            await vi.advanceTimersByTimeAsync(100);
            model.size = 100;
            await vi.advanceTimersByTimeAsync(250);

            expect(store.data).toEqual({});
        });
    });

    describe('settleTime', () => {
        it('ignores changes made within settleTime of the last read', async () => {
            vi.useFakeTimers();
            const store = new MemoryStore({layout: {size: 300}}),
                model = createModel({...store.options, settleTime: 1000, debounce: 0});

            // e.g. a component adjusting restored state as it first renders
            model.size = 280;
            await vi.advanceTimersByTimeAsync(500);
            model.size = 290;
            expect(store.setData).not.toHaveBeenCalled();

            await vi.advanceTimersByTimeAsync(1000);
            model.size = 400;
            expect(store.data).toEqual({layout: {size: 400}});
        });
    });

    describe('pushStateToTarget', () => {
        // ViewManagerModel and DashViewModel call this when the stored state is swapped out.
        it('applies the current stored state, or the default if none', () => {
            const store = new MemoryStore({layout: {size: 300}}),
                model = createModel({...store.options, debounce: 0});

            store.data = {layout: {size: 500}};
            model.provider.pushStateToTarget();
            expect(model.size).toBe(500);

            store.data = {};
            model.provider.pushStateToTarget();
            expect(model.size).toBe(100);
        });
    });

    describe('destroy', () => {
        it('stops writing once its owner is destroyed', () => {
            const store = new MemoryStore(),
                model = new LayoutModel({...store.options, debounce: 0});

            model.destroy();
            model.size = 300;
            expect(store.setData).not.toHaveBeenCalled();
        });
    });
});

//------------------
// Test support
//------------------
interface LayoutState {
    size: number;
}

/** A model that persists its own state via a provider, as PanelModel and other built-ins do. */
class LayoutModel extends HoistModel implements Persistable<LayoutState> {
    @bindable accessor size = 100;

    readonly provider: PersistenceProvider<LayoutState>;

    constructor(persistWith: PersistOptions) {
        super();
        this.provider = PersistenceProvider.create({
            persistOptions: {path: 'layout', ...persistWith},
            target: this
        });
    }

    getPersistableState() {
        return new PersistableState({size: this.size});
    }

    setPersistableState(state: PersistableState<LayoutState>) {
        this.size = state.value.size;
    }
}

function createModel(persistWith: PersistOptions): LayoutModel {
    const ret = new LayoutModel(persistWith);
    onTestFinished(() => ret.destroy());
    return ret;
}

/** In-memory backing store, read and written via a CustomProvider. */
class MemoryStore {
    data: PlainObject;
    readonly setData = vi.fn((data: PlainObject) => (this.data = data));

    constructor(data: PlainObject = {}) {
        this.data = data;
    }

    get options(): PersistOptions {
        return {getData: () => this.data, setData: this.setData};
    }
}

/** An app-defined provider, reading its backing object from a custom option. */
class HolderProvider extends PersistenceProvider<LayoutState> {
    readonly holder: {state: PlainObject};

    constructor(cfg: PersistenceProviderConfig<LayoutState>) {
        super(cfg);
        this.holder = cfg.persistOptions['holder'];
    }

    protected override readRaw() {
        return this.holder.state;
    }

    protected override writeRaw(data: PlainObject) {
        this.holder.state = data;
    }
}
