/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ViewportSizeModel} from './ViewportSizeModel';

// Longer than the model's 100ms measure debounce plus its slowest 300ms orientation check.
const SETTLE_MS = 500;

/**
 * Apps read the viewport size and orientation from `XH.viewportSizeModel` to adapt layouts, and
 * mobile apps switch between portrait and landscape layouts on `isPortrait`.
 */
describe('ViewportSizeModel', () => {
    const {innerWidth, innerHeight} = window,
        orientation = window.screen.orientation as {type: string},
        orientationType = orientation.type;

    afterEach(() => {
        Object.assign(window, {innerWidth, innerHeight});
        orientation.type = orientationType;
    });

    function resizeWindow(width: number, height: number) {
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

    it('reads orientation from the Screen Orientation API', async () => {
        const model = await createModelAsync();

        // The API wins over the window's landscape shape.
        orientation.type = 'portrait-primary';
        resizeWindow(1200, 800);
        await vi.advanceTimersByTimeAsync(SETTLE_MS);
        expect(model.isPortrait).toBe(true);
        expect(model.isLandscape).toBe(false);

        model.destroy();
    });

    it('falls back to the window shape without the Screen Orientation API', async () => {
        const model = await createModelAsync();
        orientation.type = undefined;

        resizeWindow(800, 1200);
        await vi.advanceTimersByTimeAsync(SETTLE_MS);
        expect(model.isPortrait).toBe(true);

        resizeWindow(1200, 800);
        await vi.advanceTimersByTimeAsync(SETTLE_MS);
        expect(model.isPortrait).toBe(false);

        model.destroy();
    });

    // Test-support destroys XH's instance before Vitest tears down jsdom at the end of each spec
    // file. `@debounced` drops the pending measure, so it never reads a `window` that is gone.
    it('stops measuring once destroyed, including a measure already pending', async () => {
        const model = await createModelAsync(),
            {size} = model;

        resizeWindow(1024, 768);
        model.destroy();
        resizeWindow(640, 480);
        await vi.advanceTimersByTimeAsync(SETTLE_MS);
        expect(model.size).toBe(size);
    });
});
