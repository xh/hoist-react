/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {describe, expect, it, onTestFinished, vi} from 'vitest';
import {ViewportSizeModel} from './ViewportSizeModel';

// Longer than the model's 100ms measure debounce plus its slowest 300ms orientation check.
const SETTLE_MS = 500;

/**
 * ViewportSizeModel measures the window on debounced timers after every resize. Test-support
 * destroys it at the end of each spec file, so it must leave nothing scheduled to read `window`
 * after the test environment is gone. XH's own instance also hears these resizes, so the tests
 * check the model's size rather than count timers.
 */
describe('ViewportSizeModel', () => {
    function resizeWindow(width: number, height: number) {
        const {innerWidth, innerHeight} = window;
        onTestFinished(() => {
            Object.assign(window, {innerWidth, innerHeight});
        });
        Object.assign(window, {innerWidth: width, innerHeight: height});
        window.dispatchEvent(new Event('resize'));
    }

    async function createModelAsync() {
        vi.useFakeTimers();
        const model = new ViewportSizeModel();
        await vi.advanceTimersByTimeAsync(SETTLE_MS);
        return model;
    }

    it('measures the window once a resize settles', async () => {
        const model = await createModelAsync();

        resizeWindow(800, 1200);
        await vi.advanceTimersByTimeAsync(SETTLE_MS);
        expect(model.size).toEqual({width: 800, height: 1200});

        model.destroy();
    });

    it('cancels a pending measure on destroy, even right after a resize', async () => {
        const model = await createModelAsync(),
            {size} = model;

        resizeWindow(1024, 768);
        model.destroy();
        await vi.advanceTimersByTimeAsync(SETTLE_MS);
        expect(model.size).toBe(size);
    });

    it('ignores resizes after destroy', async () => {
        const model = await createModelAsync(),
            {size} = model;

        model.destroy();
        resizeWindow(640, 480);
        await vi.advanceTimersByTimeAsync(SETTLE_MS);
        expect(model.size).toBe(size);
    });
});
