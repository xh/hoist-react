/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {persistOptions} from '@xh/hoist/core';
import {describe, expect, it} from 'vitest';

/**
 * The merge rules for PersistOptions. `@persist`, `markPersist()` and most built-in persisted
 * models (GridModel, FormModel, TabContainerModel, choosers) combine a parent `persistWith` with
 * their own options through this function, so a wrong merge silently sends state to the wrong
 * store or path.
 */
describe('persistOptions', () => {
    it('gives later options precedence, skipping null and undefined', () => {
        const ret = persistOptions(
            {path: 'grid', debounce: 100},
            null, // e.g. a model with no persistWith
            {path: 'detailGrid'},
            undefined
        );
        expect(ret).toEqual({path: 'detailGrid', debounce: 100});
    });

    it('keeps the inherited provider when an override names none', () => {
        const ret = persistOptions({prefKey: 'reportState', debounce: 100}, {path: 'grid'});
        expect(ret).toEqual({prefKey: 'reportState', debounce: 100, path: 'grid'});
    });

    // Fixed in v72.1.0 - an inherited prefKey outranked a child's localStorageKey.
    it('replaces every inherited provider key when an override names a provider', () => {
        const ret = persistOptions(
            {prefKey: 'reportState', debounce: 100},
            {localStorageKey: 'reportGrid'}
        );
        expect(ret).toEqual({localStorageKey: 'reportGrid', debounce: 100});
    });

    it('concatenates pathPrefix through successive merges', () => {
        const ret = persistOptions(
            {prefKey: 'appState', pathPrefix: 'reports'},
            {pathPrefix: 'detail'},
            {pathPrefix: 'grid', path: 'columns'}
        );
        expect(ret).toEqual({
            prefKey: 'appState',
            pathPrefix: 'reports.detail.grid',
            path: 'columns'
        });
    });
});
