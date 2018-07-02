/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH, HoistService} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/JsUtils';
import store from 'store2';

@HoistService()
export class LocalStorageService {
    _supported = !store.isFake();

    get(key, defaultValue) {
        const storage = this.getInstance(),
            val = storage.get(key, defaultValue);

        throwIf(val === undefined, `Key '${key}' not found`);
        return val;
    }

    set(key, value) {
        this.getInstance().set(key, value, true);
    }

    apply(key, newProps) {
        const val = this.get(key, {}),
            newVal = Object.assign(val, newProps);

        this.set(key, newVal, true);
    }

    remove(key) {
        this.getInstance().remove(key);
    }

    clear() {
        this.getInstance().clear();
    }

    //------------------
    //  Implementation
    //------------------
    getInstance() {
        throwIf(!this._supported, 'Local Storage is not supported');
        return store.namespace(XH.appName);
    }
}