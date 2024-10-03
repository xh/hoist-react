/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {DebounceSpec, XH} from '../';
import {
    LocalStorageProvider,
    PrefProvider,
    DashViewProvider,
    ViewManagerProvider,
    CustomProvider,
    PersistOptions
} from './';
import {
    cloneDeep,
    isUndefined,
    get,
    set,
    unset,
    isNumber,
    debounce as lodashDebounce
} from 'lodash';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Abstract superclass for adaptor objects used by models and components to (re)store state to and
 * from a persistent location, typically a Hoist preference or key within browser local storage.
 *
 * Note that multiple instances of this object may be writing into the same location.
 * Implementations should take care to incorporate any writes immediately into the readable state.
 *
 * Hoist-provided implementations include:
 *   - {@link PrefProvider} - stores state in a predefined Hoist application Preference.
 *   - {@link LocalStorageProvider} - stores state in browser local storage under a configured key.
 *   - {@link DashViewProvider} - stores state with other Dashboard-specific state via a `DashViewModel`.
 *   - {@link CustomProvider} - API for app and components to provide their own storage mechanism.
 */
export class PersistenceProvider {
    get isPersistenceProvider(): boolean {
        return true;
    }

    path: string;
    debounce: DebounceSpec;

    /**
     * Construct an instance of this class.
     */
    static create({type, ...rest}: PersistOptions): PersistenceProvider {
        if (!type) {
            if (rest.prefKey) type = 'pref';
            if (rest.localStorageKey) type = 'localStorage';
            if (rest.dashViewModel) type = 'dashView';
            if (rest.viewManagerModel) type = 'viewManagerModel';
            if (rest.getData || rest.setData) type = 'custom';
        }

        switch (type) {
            case 'pref':
                return new PrefProvider(rest);
            case 'localStorage':
                return new LocalStorageProvider(rest);
            case `dashView`:
                return new DashViewProvider(rest);
            case 'viewManagerModel':
                return new ViewManagerProvider(rest);
            case 'custom':
                return new CustomProvider(rest);
            default:
                throw XH.exception(`Unknown Persistence Provider for type: ${type}`);
        }
    }

    /**
     * Called by implementations only. See create.
     */
    protected constructor({path, debounce = 250}: PersistOptions) {
        throwIf(isUndefined(path), 'Path not specified in PersistenceProvider.');
        this.path = path;
        this.debounce = debounce;
        if (debounce) {
            this.writeInternal = isNumber(debounce)
                ? lodashDebounce(this.writeInternal, debounce)
                : lodashDebounce(this.writeInternal, debounce.interval, debounce);
        }
    }

    /**
     * Read data at a path
     */
    read(): any {
        return get(this.readRaw(), this.path);
    }

    /**
     * Save data at a path
     * @param data  - data to be written to the path, must be serializable to JSON.
     */
    write(data: any) {
        this.writeInternal(data);
    }

    /**
     * Clear any state saved by this object at a path
     */
    clear(path: string = this.path) {
        const obj = cloneDeep(this.readRaw());
        unset(obj, this.path);
        this.writeRaw(obj);
    }

    /**
     * Clear *all* state held by this object.
     */
    clearAll() {
        this.clearRaw();
    }

    //----------------
    // Implementation
    //----------------
    protected writeInternal(data: object) {
        const obj = cloneDeep(this.readRaw());
        set(obj, this.path, data);
        this.writeRaw(obj);
    }

    protected writeRaw(obj: object) {}
    protected readRaw(): object {
        return null;
    }
    protected clearRaw() {}
}
