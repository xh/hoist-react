/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {StateProvider} from './StateProvider';

/**
 * StateProvider that stores state within the Browsers LocalStorage.
 */
export class LocalStorageProvider extends StateProvider {

    //----------------
    // Implementation
    //----------------
    readDataImpl() {
        return XH.localStorageService.get(this.key, null);
    }

    writeDataImpl(data) {
        XH.localStorageService.set(this.key, data);
    }

    clearDataImpl() {
        XH.localStorageService.remove(this.key);
    }
}