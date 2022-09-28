/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {PersistenceProvider, PersistOptions, XH} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * PersistenceProvider that stores state within the Browser's LocalStorage.
 */
export class LocalStorageProvider extends PersistenceProvider {

    key;

    constructor({localStorageKey: key, ...rest}: PersistOptions) {
        throwIf(!key, `LocalStorageProvider requires a 'localStorageKey'.`);
        super(rest);
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
