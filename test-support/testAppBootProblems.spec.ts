/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {hoistCore, initTestAppAsync, TestAppModel} from '@xh/hoist/test-support';
import {describe, expect, it} from 'vitest';

/** A problem the kit's guards catch during boot must fail the boot, not the file's first test. */
describe('initTestAppAsync', () => {
    // Catches the failure of a request that no route serves, so boot itself succeeds.
    class FallbackAppModel extends TestAppModel {
        override async initAsync() {
            await XH.fetchJson({url: 'notServed'}).catch(() => null);
        }
    }

    // Fixed in 90.0.0 (#4866) - the problem failed the file's first test, with no hint of boot.
    it('rejects with a problem triggered during boot', async () => {
        const problemSink = hoistCore.onProblem;

        await expect(initTestAppAsync({modelClass: FallbackAppModel})).rejects.toThrow(
            /during boot[\s\S]*Not handled by fake hoist-core: GET .*\/notServed/
        );
        // Without the kit's sink back, no guard would fail a test for the rest of the file.
        expect(hoistCore.onProblem).toBe(problemSink);
    });
});
