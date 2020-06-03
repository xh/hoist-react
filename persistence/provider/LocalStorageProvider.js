/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {throwIf} from '../../utils/js';
import {PersistenceProvider} from './PersistenceProvider';

/**
 * PersistenceProvider that stores state within the Browser's LocalStorage.
 */
export class LocalStorageProvider extends PersistenceProvider {

    key;

    /** @param {string} localStorageKey */
    constructor({localStorageKey: key}) {
        throwIf(!key, `Persistence Provider requires a 'localStorageKey'.`);
        super();
        this.key = key;
    }

    //----------------
    // Implementation
    //----------------
    readRaw() {
        return XH.localStorageService.get(this.key, {});
    }

    writeRaw(data) {
        XH.localStorageService.set(this.key, data);
    }

    clearRaw() {
        XH.localStorageService.remove(this.key);
    }
}