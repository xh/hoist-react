/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {initTestAppAsync} from '@xh/hoist/test';
import {beforeAll, beforeEach, describe, expect, it} from 'vitest';

/**
 * Browser storage for apps, via `XH.localStorageService` and `XH.sessionStorageService`. Values
 * are namespaced by app code and username, so apps and users that share a browser never read or
 * clear each other's values - e.g. when one user restores their app defaults.
 */
describe('BaseStorageService', () => {
    beforeAll(() => initTestAppAsync());

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    describe('LocalStorageService', () => {
        it('stores values as JSON under a key namespaced by app code and username', () => {
            XH.localStorageService.set('recentSearches', ['TSLA', 'AAPL']);

            expect(localStorage.getItem('testApp.jdoe.recentSearches')).toBe('["TSLA","AAPL"]');
            expect(XH.localStorageService.get('recentSearches')).toEqual(['TSLA', 'AAPL']);
        });

        it('clears only the values of its own app and user', () => {
            XH.localStorageService.set('recentSearches', ['TSLA']);
            localStorage.setItem('testApp.bob.recentSearches', '["MSFT"]');
            localStorage.setItem('otherApp.jdoe.recentSearches', '["GOOG"]');

            XH.localStorageService.clear();

            expect(Object.keys(localStorage).sort()).toEqual([
                'otherApp.jdoe.recentSearches',
                'testApp.bob.recentSearches'
            ]);
        });
    });

    describe('SessionStorageService', () => {
        it('stores values in session storage, under the same namespace', () => {
            XH.sessionStorageService.set('skipConfirm', true);

            expect(sessionStorage.getItem('testApp.jdoe.skipConfirm')).toBe('true');
            expect(localStorage).toHaveLength(0);
        });
    });
});
