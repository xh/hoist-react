/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {initTestAppAsync, TestAppModel} from '@xh/hoist/test-support';
import {describe, expect, it, vi} from 'vitest';

/** A boot that fails must name the error that stopped it. */
describe('initTestAppAsync', () => {
    class FailingAppModel extends TestAppModel {
        override async initAsync() {
            XH.handleException(new Error('Optional feed unavailable'), {showAlert: false});
            throw new Error('Positions unavailable');
        }
    }

    // Fixed in 90.0.0 (#4866) - named the first error handled during boot instead.
    it('rejects with the error that stopped boot as the cause', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});

        const boot = initTestAppAsync({modelClass: FailingAppModel});

        await expect(boot).rejects.toMatchObject({
            message: "Test app failed to start - state is 'LOAD_FAILED'",
            cause: {message: 'Positions unavailable'}
        });
    });
});
