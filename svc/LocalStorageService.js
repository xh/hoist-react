/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH, HoistService} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import store from 'store2';

@HoistService
export class LocalStorageService {

    async initAsync() {
        if (this.supported) {
            this.migrateLegacyNamespace();
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

    //------------------
    //  Implementation
    //------------------
    get supported() {
        return !store.isFake();
    }

    getInstance() {
        throwIf(!this.supported, 'Local Storage is not supported');
        return store.namespace(this.getNamespace());
    }

    getNamespace() {
        return `${XH.appCode}.${XH.getUsername()}`;
    }

    migrateLegacyNamespace() {
        try {
            const oldSpace = store.namespace(XH.appName);
            if (oldSpace.size()) {
                console.log('Migrating Namespace for Local Storage');
                const newSpace = store.namespace(this.getNamespace());
                if (!newSpace.size()) {
                    newSpace.setAll(oldSpace.getAll());
                    console.log(`Migrated ${oldSpace.size()} keys`);
                }
                oldSpace.clear();
            }
        } catch (e) {
            console.error('Failure in Migrate Namespace for Local Storage', e);
        }
    }
}