/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {XH} from '../';
import {PersistenceProvider, PersistenceProviderConfig} from './';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * PersistenceProvider that stores state within the Hoist Preferences system.
 */
export class PrefProvider<S> extends PersistenceProvider<S> {
    readonly key: string;

    constructor(cfg: PersistenceProviderConfig<S>) {
        super(cfg);
        throwIf(!cfg.prefKey, `PrefProvider requires a 'prefKey'.`);
        this.key = cfg.prefKey;
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

    override clearRaw() {
        XH.prefService.unset(this.key);
    }
}
