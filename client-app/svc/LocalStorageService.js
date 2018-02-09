/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {BaseService} from './BaseService';
import {XH} from 'hoist';
import store from 'store2';

export class LocalStorageService extends BaseService {
    _appId = null;
    _supported = !store.isFake();

    get(key, defaultValue) {
        const storage = this.getInstance(),
            val = storage.get(key, defaultValue);

        if (!val) throw XH.exception(`Key '${key}' not found`);

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
        if (!this._appId) this._appId = XH.appName;
        if (!this._supported) throw XH.exception('Local Storage is not supported');

        return store.namespace(this._appId);
    }
}