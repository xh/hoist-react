/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, type PlainObject, uses} from '@xh/hoist/core';
import {dashCanvas, DashCanvasModel, type DashCanvasItemState} from '@xh/hoist/desktop/cmp/dash';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {act, render} from '@testing-library/react';
import {useEffect} from 'react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * The layout handshake between DashCanvasModel and react-grid-layout. RGL keeps its own copy of
 * the layout, syncs it from the `layout` prop, and reports changes back via `onLayoutChange`.
 */
describe('DashCanvas', () => {
    beforeAll(async () => {
        await initTestAppAsync();
    });

    it('keeps the latest of two layout writes made before RGL catches up', async () => {
        const model = new DashCanvasModel({
            viewSpecs: [{id: 'chart', content: () => null, width: 6, height: 5}],
            initialState: [item(0, 5), item(5, 5)]
        });
        onTestFinished(() => model.destroy());

        // Land the second write in the commit where RGL starts syncing to the first.
        const first = [item(0, 10), item(5, 5)],
            second = [item(0, 3), item(5, 5)];
        let pending = true;
        const onCommit = () => {
            if (pending && model.layout[0].h === 10) {
                pending = false;
                model.loadState(second);
            }
        };

        renderCanvas(model, onCommit);
        await act(async () => model.loadState(first));

        expect(layoutsById(model)).toEqual({
            chart_0: {x: 0, y: 0, w: 6, h: 3},
            chart_1: {x: 0, y: 3, w: 6, h: 5}
        });
    });
});

function renderCanvas(model: DashCanvasModel, onCommit: () => void) {
    // jsdom has no layout - DashCanvas holds off rendering RGL until it measures a width.
    const widthSpy = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1200);
    onTestFinished(() => widthSpy.mockRestore());

    // Observes `layout`, so it commits with the canvas and its effect runs after RGL's.
    const harness = hoistCmp.factory({
        model: uses(DashCanvasModel),
        render({model}) {
            useEffect(onCommit, [model.layout]);
            return dashCanvas();
        }
    });
    render(harness({model}));
}

function item(y: number, h: number): DashCanvasItemState {
    return {layout: {x: 0, y, w: 6, h}, viewSpecId: 'chart'};
}

function layoutsById(model: DashCanvasModel): Record<string, PlainObject> {
    return Object.fromEntries(model.layout.map(({i, x, y, w, h}) => [i, {x, y, w, h}]));
}
