/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {PersistenceProvider, XH} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * PersistenceProvider that stores state within the Hoist Preferences system.
 */
export class PrefProvider extends PersistenceProvider {

    key;

    /** @param {string} prefKey */
    constructor({prefKey: key, ...rest}) {
        throwIf(!key, `PrefProvider requires a 'prefKey'.`);
        super(rest);
        this.key = key;
    }

    //----------------
    // Implementation
    //----------------
    readRaw() {
        return XH.prefService.get(this.key);
    }

    writeRaw(data) {
        XH.prefService.set(this.key, data);
    }

    clearRaw() {
        XH.prefService.unset(this.key);
    }
}