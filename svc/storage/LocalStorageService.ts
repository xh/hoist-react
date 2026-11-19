/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {BaseStorageService} from '@xh/hoist/svc/storage/BaseStorageService';

/**
 * Service to provide simple key/value access to browser local storage, appropriately namespaced
 * by application code and username.
 *
 * Relied upon by Hoist persistence mechanisms when using key 'localStorageKey'.
 */
export class LocalStorageService extends BaseStorageService {
    static instance: LocalStorageService;

    protected override get browserStorage(): Storage {
        return window.localStorage;
    }
}
