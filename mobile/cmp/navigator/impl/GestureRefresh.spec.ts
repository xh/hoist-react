/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {GestureRefreshModel} from '@xh/hoist/mobile/cmp/navigator/impl/GestureRefreshModel';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, beforeEach, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * Pull-down-to-refresh on the mobile Navigator. The model reads touch events from the component
 * and tracks the pull. These guard when a pull starts, how far it must go, and what cancels it.
 */
describe('GestureRefreshModel', () => {
    let refresh: ReturnType<typeof vi.spyOn>;

    beforeAll(() => initTestAppAsync({isMobileApp: true}));

    beforeEach(() => {
        refresh = vi.spyOn(XH, 'refreshAppAsync').mockResolvedValue(undefined);
        onTestFinished(() => refresh.mockRestore());
    });

    it('refreshes the app after a full pull down', () => {
        const model = createModel();
        touchStart(model, 100, 100);
        touchMove(model, 100, 150);
        expect(model.refreshStarted).toBe(true);
        expect(model.refreshProgress).toBeCloseTo(50 / 150);
        touchMove(model, 100, 300);
        expect(model.refreshCompleted).toBe(true);
        model.onTouchEnd();
        expect(refresh).toHaveBeenCalledOnce();
        expect(model.refreshProgress).toBeNull();
    });

    it('does not refresh after a partial pull', () => {
        const model = createModel();
        touchStart(model, 100, 100);
        touchMove(model, 100, 180);
        model.onTouchEnd();
        expect(refresh).not.toHaveBeenCalled();
    });

    it('ignores movement too small to be a drag', () => {
        const model = createModel();
        touchStart(model, 100, 100);
        touchMove(model, 100, 105);
        expect(model.refreshStarted).toBe(false);
    });

    it('ignores a drag that starts in another direction', () => {
        const model = createModel();
        touchStart(model, 100, 100);
        touchMove(model, 150, 110);
        expect(model.refreshStarted).toBe(false);
        touchMove(model, 150, 400);
        expect(model.refreshStarted).toBe(false);
    });

    it('cancels a pull that reverses direction', () => {
        const model = createModel();
        touchStart(model, 100, 100);
        touchMove(model, 100, 200);
        expect(model.refreshStarted).toBe(true);
        touchMove(model, 100, 50);
        expect(model.refreshStarted).toBe(false);
        model.onTouchEnd();
        expect(refresh).not.toHaveBeenCalled();
    });

    it('does nothing when the navigator disables pull down to refresh', () => {
        const model = createModel(false);
        touchStart(model, 100, 100);
        touchMove(model, 100, 300);
        expect(model.refreshStarted).toBe(false);
    });
});

//------------------
// Helpers
//------------------
function createModel(pullDownToRefresh = true) {
    const model = new GestureRefreshModel();
    onTestFinished(() => model.destroy());
    // Stand in for the NavigatorModel the component resolves from context.
    model.navigatorModel = {pullDownToRefresh};
    return model;
}

function touchEvent(x: number, y: number): any {
    return {touches: [{clientX: x, clientY: y}], nativeEvent: {target: document.body}};
}

function touchStart(model: GestureRefreshModel, x: number, y: number) {
    model.onTouchStart(touchEvent(x, y));
}

function touchMove(model: GestureRefreshModel, x: number, y: number) {
    model.onTouchMove(touchEvent(x, y));
}
