/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {hoistCore, initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * The bar an admin opens to pick a user to impersonate. It loads the users it offers from the
 * server when first opened.
 */
describe('ImpersonationBarModel', () => {
    beforeAll(async () => {
        hoistCore.roles = ['APP_USER', 'HOIST_IMPERSONATOR'];
        hoistCore.configs.xhEnableImpersonation = true;
        await initTestAppAsync();
    });

    it('loads targets once when no other user can be impersonated', async () => {
        // The only target is the current user, whom the bar leaves out.
        hoistCore.route('GET', 'xh/impersonationTargets', () => [{username: 'jdoe'}]);

        XH.showImpersonationBar();
        await hoistCore.settleAsync();

        expect(XH.appContainerModel.impersonationBarModel.targets).toEqual([]);
        expect(hoistCore.requestsTo('xh/impersonationTargets')).toHaveLength(1);
    });
});
