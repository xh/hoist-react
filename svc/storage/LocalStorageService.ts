/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {BaseStorageService} from '@xh/hoist/svc/storage/BaseStorageService';
import store, {StoreType} from 'store2';

/**
 * Service to provide simple key/value access to browser local storage, appropriately namespaced
 * by application code and username.
 *
 * Relied upon by Hoist persistence mechanisms when using key 'localStorageKey'.
 */
export class LocalStorageService extends BaseStorageService {
    static instance: LocalStorageService;

    protected get storeInstance(): StoreType {
        return store.local.namespace(`${XH.appCode}.${XH.getUsername()}`);
    }
}
