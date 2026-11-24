/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * App startup for a mobile app, which loads the mobile platform and its component impls.
 */
describe('AppContainerModel', () => {
    beforeAll(async () => {
        await initTestAppAsync({isMobileApp: true});
    });

    it('boots a mobile app', () => {
        expect(XH.appState).toBe('RUNNING');
        expect(XH.isMobileApp).toBe(true);
    });
});
