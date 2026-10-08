/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {initTestAppAsync} from '@xh/hoist/test-support';
import {describe, expect, it} from 'vitest';

/**
 * App startup after `XH.reloadApp()`, which appends an `xhCacheBuster` query param to force a
 * reload past the browser cache. The param must not outlive the reload it was added for.
 */
describe('AppContainerModel', () => {
    describe('initAsync', () => {
        it('drops xhCacheBuster from the URL, leaving other query params as encoded', async () => {
            window.history.replaceState(
                null,
                '',
                '/app?test=a%20b&xhCacheBuster=1700000000000&tab=x#frag'
            );

            await initTestAppAsync();

            expect(window.location.pathname).toBe('/app');
            expect(window.location.search).toBe('?test=a%20b&tab=x');
            expect(window.location.hash).toBe('#frag');
        });
    });
});
