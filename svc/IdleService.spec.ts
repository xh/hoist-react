/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {hoistCore, initTestAppAsync, prefEntry} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * Suspends an app left idle for the timeout in the `xhIdleConfig` config, unless the user has
 * opted out via the `xhIdleDetectionDisabled` pref.
 */
describe('IdleService', () => {
    beforeAll(async () => {
        // A 60ms timeout, so the app is idle almost at once.
        hoistCore.configs.xhIdleConfig = {timeout: 0.001, appTimeouts: {}};
        hoistCore.prefs.xhIdleDetectionDisabled = prefEntry('bool', false, true);
        await initTestAppAsync();
    });

    it('starts monitoring when the user turns idle detection back on', async () => {
        await wait(700);
        expect(XH.appState).toBe('RUNNING');

        XH.setPref('xhIdleDetectionDisabled', false);
        await expect.poll(() => XH.appState).toBe('SUSPENDED');
        expect(XH.appContainerModel.appStateModel.suspendData.reason).toBe('IDLE');
    });
});
