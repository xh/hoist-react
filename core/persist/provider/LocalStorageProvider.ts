/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import type {PersistenceProviderConfig} from '../PersistenceProvider';
import {PersistenceProvider} from '../PersistenceProvider';

/**
 * PersistenceProvider that stores state within the Browser's LocalStorage.
 */
export class LocalStorageProvider<S> extends PersistenceProvider<S> {
    readonly key: string;

    constructor(cfg: PersistenceProviderConfig<S>) {
        super(cfg);
        const {localStorageKey} = cfg.persistOptions;
        throwIf(!localStorageKey, `LocalStorageProvider requires a 'localStorageKey'.`);
        this.key = localStorageKey;
    }

    //----------------
    // Implementation
    //----------------
    override readRaw() {
        return XH.localStorageService.get(this.key, {});
    }

    override writeRaw(data) {
        XH.localStorageService.set(this.key, data);
    }
}
