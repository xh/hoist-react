/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistService, XH} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import store from 'store2';

/**
 * Service to provide simple key/value access to browser local storage, appropriately namespaced
 * by application code and username.
 *
 * In the unexpected case that local storage is not available, will provide a transient in-memory
 * storage to support its operations and API.
 *
 * Relied upon by Hoist features such as local preference values and grid state.
 */
export class LocalStorageService extends HoistService {

    constructor() {
        super();
        if (this.isFake) {
            XH.handleException(
                XH.exception(
                    'Local Storage is not supported in this browser. Transient in-memory storage ' +
                    'will be used as a fallback.  All data stored will be lost when page is closed.'
                ),
                {showAlert: false}
            );
        }
    }

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

    removeIf(predicateFn) {
        this.keys().forEach(key => {
            if (predicateFn(key)) this.remove(key);
        });
    }

    clear() {
        this.getInstance().clear();
    }

    keys() {
        return this.getInstance().keys();
    }

    get isFake() {
        return store.isFake();
    }

    //------------------
    //  Implementation
    //------------------
    getInstance() {
        return store.namespace(this.getNamespace());
    }

    getNamespace() {
        return `${XH.appCode}.${XH.getUsername()}`;
    }
}
