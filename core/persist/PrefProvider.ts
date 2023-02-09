/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {XH} from '../';
import {PersistenceProvider, PersistOptions} from './';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * PersistenceProvider that stores state within the Hoist Preferences system.
 */
export class PrefProvider extends PersistenceProvider {

    key: string;

    constructor({prefKey: key, ...rest}: PersistOptions) {
        throwIf(!key, `PrefProvider requires a 'prefKey'.`);
        super(rest);
        this.key = key;
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
