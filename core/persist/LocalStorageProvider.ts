/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {PersistenceProvider, PersistenceProviderConfig} from './';
import {throwIf} from '@xh/hoist/utils/js';
import {XH} from '../';

/**
 * PersistenceProvider that stores state within the Browser's LocalStorage.
 */
export class LocalStorageProvider<S> extends PersistenceProvider<S> {
    declare key: string;

    override init({localStorageKey: key}: PersistenceProviderConfig<S>) {
        throwIf(!key, `LocalStorageProvider requires a 'localStorageKey'.`);
        this.key = key;
    }

    //----------------
    // Implementation
    //----------------
    override readRaw() {
        return XH.localStorageService.get(this.key, {});
    }

    override writeRaw(data) {
        XH.localStorageService.set(this.key, data);
    }

    override clearRaw() {
        XH.localStorageService.remove(this.key);
    }
}
