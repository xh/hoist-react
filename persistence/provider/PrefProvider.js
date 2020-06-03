/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {throwIf} from '../../utils/js';
import {PersistenceProvider} from './PersistenceProvider';
import {XH} from '@xh/hoist/core';

/**
 * State Provider that uses the Hoist preference system for underlying storage.
 */
export class PrefProvider extends PersistenceProvider {

    key;

    /** @param {string} prefKey */
    constructor({prefKey: key}) {
        throwIf(!key, `Persistence Provider requires a 'prefKey'.`);
        super();
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