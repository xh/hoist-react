/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import {PersistenceProvider, PersistenceProviderConfig} from '../PersistenceProvider';

/**
 * PersistenceProvider that stores state within the Browser's SessionStorage.
 */
export class SessionStorageProvider<S> extends PersistenceProvider<S> {
    readonly key: string;

    constructor(cfg: PersistenceProviderConfig<S>) {
        super(cfg);
        const {sessionStorageKey} = cfg.persistOptions;
        throwIf(!sessionStorageKey, `SessionStorageProvider requires a 'sessionStorageKey'.`);
        this.key = sessionStorageKey;
    }

    //----------------
    // Implementation
    //----------------
    override readRaw() {
        return XH.sessionStorageService.get(this.key, {});
    }

    override writeRaw(data) {
        XH.sessionStorageService.set(this.key, data);
    }
}
