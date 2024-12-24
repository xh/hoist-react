/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistService, XH} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import {StoreType} from 'store2';

/**
 * Service to provide simple key/value access to browser local/session storage, appropriately
 * namespaced by application code and username.
 *
 * In the unexpected case that the core apis are not available, will provide a transient in-memory
 * storage to support its operations and API.
 */
export abstract class BaseStorageService extends HoistService {
    constructor() {
        super();
        if (this.isFake) {
            XH.handleException(
                XH.exception(
                    'Requested Storage is not supported in this browser. Transient in-memory storage ' +
                        'will be used as a fallback.  All data stored will be lost when page is closed.'
                ),
                {showAlert: false}
            );
        }
    }

    get(key: string, defaultValue?: any): any {
        const storage = this.storeInstance,
            val = storage.get(key, defaultValue);

        throwIf(val === undefined, `Key '${key}' not found`);
        return val;
    }

    set(key: string, value: any) {
        this.storeInstance.set(key, value, true);
    }

    apply(key: string, newProps: object) {
        const val = this.get(key, {}),
            newVal = Object.assign(val, newProps);

        this.set(key, newVal);
    }

    remove(key: string) {
        this.storeInstance.remove(key);
    }

    removeIf(predicateFn: (s: string) => boolean) {
        this.keys().forEach(key => {
            if (predicateFn(key)) this.remove(key);
        });
    }

    clear() {
        this.storeInstance.clear();
    }

    keys(): string[] {
        return this.storeInstance.keys();
    }

    get isFake(): boolean {
        return this.storeInstance.isFake();
    }

    //------------------
    //  Implementation
    //------------------
    protected abstract get storeInstance(): StoreType;
}
