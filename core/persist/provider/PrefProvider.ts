/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core/';
import {PersistenceProvider, PersistenceProviderConfig} from '../PersistenceProvider';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * PersistenceProvider that stores state within the Hoist Preferences system.
 */
export class PrefProvider<S> extends PersistenceProvider<S> {
    readonly key: string;

    constructor(cfg: PersistenceProviderConfig<S>) {
        super(cfg);
        const {prefKey} = cfg.persistOptions;
        throwIf(!prefKey, `PrefProvider requires a 'prefKey'.`);
        this.key = prefKey;
    }

    //----------------
    // Implementation
    //----------------
    override readRaw() {
        return XH.prefService.get(this.key);
    }

    override writeRaw(data) {
        XH.prefService.set(this.key, data);
    }
}
