/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {hoistCore, initTestAppAsync, TestAppModel} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * `initTestAppAsync()` boots an app as a browser does. What happens at boot must not leak into
 * the file's first test, and must stay visible - specs debug a boot they cannot see.
 */
describe('initTestAppAsync', () => {
    const handled = new Error('Optional feed unavailable');
    let loggedErrors: unknown[][], problemSink: (msg: string) => void;

    // Handles one error and starts requests without awaiting them, as app models can at boot.
    class BootAppModel extends TestAppModel {
        override async initAsync() {
            XH.handleException(handled, {showAlert: false});
            XH.fetchJson({url: 'list'}).then(() => XH.fetchJson({url: 'details'}));
        }
    }

    beforeAll(async () => {
        hoistCore.route('GET', 'list', () => [1]);
        hoistCore.route('GET', 'details', () => ({ok: true}));
        problemSink = hoistCore.onProblem;
        const consoleError = vi.spyOn(console, 'error');
        await initTestAppAsync({modelClass: BootAppModel});
        loggedErrors = consoleError.mock.calls;
        consoleError.mockRestore();
    });

    // First in the file, so the log would still hold any request that boot left open.
    // Fixed in 90.0.0 (#4866) - requests that boot did not await landed in this log.
    it('settles the requests boot started before the first test', async () => {
        await hoistCore.settleAsync();
        expect(hoistCore.requests).toEqual([]);
    });

    // Boot collects problems through the kit's sink - without it back, no guard fails a test.
    it("restores the kit's problem sink after boot", () => {
        expect(hoistCore.onProblem).toBe(problemSink);
    });

    // A pref saved at boot goes out on a 5s debounce - after the server closes, in a short file.
    it('leaves no pref change to save after boot', async () => {
        await XH.prefService.pushPendingAsync();
        expect(hoistCore.requestsTo('xh/setPrefs')).toEqual([]);
    });

    // Fixed in 90.0.0 (#4866) - errors handled during boot were dropped without a trace.
    it('logs an error the app handled during boot', () => {
        expect(loggedErrors).toContainEqual([expect.any(String), handled]);
    });
});
