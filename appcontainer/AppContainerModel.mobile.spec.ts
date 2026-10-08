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
 * App startup for a mobile app. Loading the mobile platform imports Onsen UI, which inspects the
 * document's styles at import - so this also checks that the kit's jsdom setup supports it.
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
