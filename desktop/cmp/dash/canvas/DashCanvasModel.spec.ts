/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PersistOptions, PlainObject} from '@xh/hoist/core';
import {
    DashCanvasModel,
    type DashCanvasConfig,
    type DashCanvasItemState
} from '@xh/hoist/desktop/cmp/dash';
import {wait} from '@xh/hoist/promise';
import {describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * The state model behind DashCanvas: placing, loading, and dropping widgets, and the `state` it
 * publishes for persistence. That state is a user's saved dashboard, so a stale or lost publish
 * loses their layout. Rendering is left out - react-grid-layout's layouts are plain arrays here.
 */
describe('DashCanvasModel', () => {
    describe('addView', () => {
        it('places views in the next free slot, left to right then top to bottom', () => {
            const model = createCanvas();
            model.addView('chart');
            model.addView('grid');
            model.addView('chart');

            expect(layoutsById(model)).toEqual({
                chart_0: {x: 0, y: 0, w: 6, h: 5},
                grid_0: {x: 6, y: 0, w: 6, h: 5},
                chart_1: {x: 0, y: 5, w: 6, h: 5}
            });
        });

        it('enforces the unique and allowAdd settings of view specs', () => {
            const model = createCanvas();
            model.addView('summary');

            expect(() => model.addView('summary')).toThrow('unique=true');
            expect(() => model.addView('legacy')).toThrow('allowAdd=false');
            expect(model.viewModels.map(it => it.id)).toEqual(['summary_0']);
        });
    });

    describe('replaceView', () => {
        it('swaps in a view of another spec at the same position and size', () => {
            const model = createCanvas({initialState: [item('chart', 6, 5, {w: 4, h: 3})]}),
                chart = model.viewModels[0];

            model.replaceView('chart_0', 'grid');

            expect(chart.isDestroyed).toBe(true);
            expect(layoutsById(model)).toEqual({grid_0: {x: 6, y: 5, w: 4, h: 3}});
        });
    });

    describe('loadState', () => {
        // Views are matched by spec id and position, and reused rather than rebuilt - see #4544.
        it('reuses matched views, replacing their state, and destroys the rest', () => {
            const model = createCanvas({
                    initialState: [
                        item('chart', 0, 0, {state: {metric: 'pnl'}}),
                        item('chart', 6, 0),
                        item('grid', 0, 5)
                    ]
                }),
                [chart0, chart1, grid0] = model.viewModels;

            model.loadState([
                item('chart', 0, 0, {state: {metric: 'volume'}}),
                item('chart', 0, 5)
            ]);

            expect(model.viewModels).toEqual([chart0, chart1]);
            expect(chart0.viewState).toEqual({metric: 'volume'});
            expect(chart1.viewState).toBeNull();
            expect(grid0.isDestroyed).toBe(true);
        });

        // Fixed in 86.0.0 (ffcf2aa1e) - a reused view's title was wiped when state omitted one.
        it('resets the title of a reused view to its spec title when state omits one', () => {
            const model = createCanvas({initialState: [item('chart', 0, 0, {title: 'P&L'})]}),
                chart = model.viewModels[0];
            expect(chart.title).toBe('P&L');

            model.loadState([item('chart', 0, 0)]);
            expect(chart.title).toBe('Chart');
        });

        it('skips entries for unknown view specs', () => {
            const model = createCanvas(),
                warn = vi.spyOn(model, 'logWarn').mockImplementation(() => {});

            model.loadState([item('retired', 0, 0), item('grid', 6, 0)]);

            expect(model.viewModels.map(it => it.id)).toEqual(['grid_0']);
            expect(warn).toHaveBeenCalled();
        });

        // Fixed in 75.0.0 (#4028) - allowAdd only governs adding views, not restoring saved ones.
        it('loads views whose spec disallows adding', () => {
            const model = createCanvas();
            model.loadState([item('legacy', 0, 0)]);
            expect(model.viewModels.map(it => it.id)).toEqual(['legacy_0']);
        });
    });

    describe('state', () => {
        it('publishes changes to view titles and state', () => {
            const model = createCanvas({initialState: [item('chart', 0, 0)]}),
                chart = model.viewModels[0];

            chart.title = 'P&L';
            chart.setViewStateKey('metric', 'pnl');

            expect(model.state).toEqual([
                item('chart', 0, 0, {title: 'P&L', state: {metric: 'pnl'}})
            ]);
        });

        it('publishes layout changes made by the user', () => {
            const model = createCanvas({initialState: [item('chart', 0, 0), item('grid', 6, 0)]});

            model.onRglLayoutChange([
                {i: 'chart_0', x: 6, y: 0, w: 6, h: 5},
                {i: 'grid_0', x: 0, y: 0, w: 6, h: 8}
            ]);

            expect(model.state).toEqual([item('chart', 6, 0), item('grid', 0, 0, {h: 8})]);
        });

        // Fixed in 86.0.0 (ffcf2aa1e) - restoring defaults after only moving widgets left state stale.
        it('publishes a load that changes only the layout', () => {
            const model = createCanvas({initialState: [item('chart', 0, 0)]});
            model.onRglLayoutChange([{i: 'chart_0', x: 6, y: 0, w: 6, h: 5}]);

            model.loadState([item('chart', 0, 0)]);
            expect(model.state).toEqual([item('chart', 0, 0)]);
        });
    });

    describe('onRglLayoutChange', () => {
        // Fixed in 87.0.0 (#4599) - adopting RGL's lagging layout after a drop looped until React aborted.
        it('ignores a layout whose views do not match the current views', () => {
            const model = createCanvas({initialState: [item('chart', 0, 0), item('grid', 6, 0)]}),
                {state} = model;

            model.onRglLayoutChange([{i: 'chart_0', x: 0, y: 3, w: 6, h: 5}]);

            expect(model.state).toBe(state);
            expect(layoutsById(model).grid_0).toEqual({x: 6, y: 0, w: 6, h: 5});
        });
    });

    describe('onDrop', () => {
        // Fixed in 87.0.0 (#4599) - the dropped view now takes the slot RGL reserved for it mid-drag.
        it('adds the dragged-in view at the placeholder in the drag layout', async () => {
            const onDropDone = vi.fn(),
                model = createCanvas({initialState: [item('chart', 0, 0)], onDropDone}),
                placeholder = {i: '__dropping-elem__', x: 0, y: 0, w: 6, h: 5};

            model.setDraggedInView(item('grid', 0, 0, {title: 'Positions'}));
            model.onDrop([{i: 'chart_0', x: 0, y: 5, w: 6, h: 5}, placeholder], placeholder, null);

            const grid = model.viewModels[1];
            expect(grid.title).toBe('Positions');
            expect(layoutsById(model)).toEqual({
                chart_0: {x: 0, y: 5, w: 6, h: 5},
                grid_0: {x: 0, y: 0, w: 6, h: 5}
            });

            await wait();
            expect(onDropDone).toHaveBeenCalledWith(grid);
            expect(model.draggedInView).toBeNull();
        });

        it('cancels a drop when the drag layout has no placeholder', () => {
            const model = createCanvas({initialState: [item('chart', 0, 0)]});

            model.setDraggedInView(item('grid', 0, 0));
            model.onDrop([{i: 'chart_0', x: 0, y: 0, w: 6, h: 5}], null, null);

            expect(model.viewModels.map(it => it.id)).toEqual(['chart_0']);
            expect(model.draggedInView).toBeNull();
        });
    });

    describe('persistence', () => {
        // Fixed in 82.0.3 (dbf93e62c) - state stayed at the initial state when only view state or
        // titles differed from it.
        it('restores persisted state on construction and publishes it as current', () => {
            const saved = [item('chart', 0, 0, {title: 'P&L', state: {metric: 'pnl'}})],
                store = new MemoryStore({dashCanvas: {state: saved}}),
                model = createCanvas({
                    initialState: [item('chart', 0, 0)],
                    persistWith: store.options
                });

            expect(model.viewModels[0].viewState).toEqual({metric: 'pnl'});
            expect(model.state).toEqual(saved);
        });

        // Writes are held off for a settle time after state is read, while the grid lays out.
        it('writes changes to its views to persisted state', async () => {
            vi.useFakeTimers();
            const store = new MemoryStore(),
                model = createCanvas({
                    initialState: [item('chart', 0, 0)],
                    persistWith: store.options
                });

            await vi.advanceTimersByTimeAsync(1001);
            model.viewModels[0].setViewStateKey('metric', 'pnl');

            expect(store.data).toEqual({
                dashCanvas: {state: [item('chart', 0, 0, {state: {metric: 'pnl'}})]}
            });
        });

        it('restores the initial views and locks on restoreDefaults, clearing persisted state', async () => {
            vi.useFakeTimers();
            const store = new MemoryStore({
                    dashCanvas: {state: [item('grid', 0, 0), item('chart', 6, 0)]}
                }),
                model = createCanvas({
                    initialState: [item('chart', 0, 0)],
                    persistWith: store.options
                });
            await vi.advanceTimersByTimeAsync(1001);
            model.layoutLocked = true;

            model.restoreDefaults();

            expect(model.state).toEqual([item('chart', 0, 0)]);
            expect(model.layoutLocked).toBe(false);
            expect(store.data).toEqual({});
        });
    });
});

//------------------
// Test support
//------------------
const VIEW_SPECS = [
    {id: 'chart', content: () => null, width: 6, height: 5},
    {id: 'grid', content: () => null, width: 6, height: 5},
    {id: 'summary', content: () => null, unique: true},
    {id: 'legacy', content: () => null, allowAdd: false}
];

function createCanvas(config: Partial<DashCanvasConfig> = {}): DashCanvasModel {
    const ret = new DashCanvasModel({viewSpecs: VIEW_SPECS, ...config});
    onTestFinished(() => ret.destroy());
    return ret;
}

/** A canvas item state, as the model publishes it - spec title and null view state by default. */
function item(
    viewSpecId: string,
    x: number,
    y: number,
    {
        w = 6,
        h = 5,
        title,
        state = null
    }: {w?: number; h?: number; title?: string; state?: PlainObject} = {}
): DashCanvasItemState {
    return {
        layout: {x, y, w, h},
        viewSpecId,
        title: title ?? VIEW_TITLES[viewSpecId],
        state
    };
}

const VIEW_TITLES = {chart: 'Chart', grid: 'Grid', summary: 'Summary', legacy: 'Legacy'};

function layoutsById(model: DashCanvasModel): Record<string, PlainObject> {
    return Object.fromEntries(model.layout.map(({i, x, y, w, h}) => [i, {x, y, w, h}]));
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
