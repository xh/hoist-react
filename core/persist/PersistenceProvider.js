/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {LocalStorageProvider, PrefProvider, DashViewProvider, CustomProvider} from '../';
import {
    isUndefined,
    cloneDeep,
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
 * @see PrefProvider - stores state in a predefined Hoist application Preference.
 * @see LocalStorageProvider - stores state in browser local storage under a configured key.
 * @see DashViewProvider - stores state with other Dashboard-specific state via a `DashViewModel`.
 * @see CustomProvider - provides API for application and components to provide their own
 *      storage mechanism.
 */
export class PersistenceProvider {

    get isPersistenceProvider() {return true}

    path;
    debounce;

    /**
     * Construct an instance of this class.
     *
     * @param {PersistOptions} spec
     * @return {PersistenceProvider}
     */
    static create({type, ...rest}) {
        if (!type) {
            if (rest.prefKey) type = 'pref';
            if (rest.localStorageKey) type = 'localStorage';
            if (rest.dashViewModel) type = 'dashView';
            if (rest.getData || rest.setData) type = 'custom';
        }

        switch (type) {
            case 'pref':
                return new PrefProvider(rest);
            case 'localStorage':
                return new LocalStorageProvider(rest);
            case `dashView`:
                return new DashViewProvider(rest);
            case 'custom':
                return new CustomProvider(rest);
            default:
                throw XH.exception(`Unknown Persistence Provider for type: ${type}`);
        }
    }

    /**
     * @private
     *
     * Called by implementations only. See create.
     *
     * @param {string} path - dot delimited path
     * @param {(number|object)} debounce - debounce interval in ms, or a lodash debounce config.
     */
    constructor({path, debounce = 250}) {
        throwIf(isUndefined(path), 'Path not specified in PersistenceProvider.');
        this.path = path;
        this.debounce = debounce;
        if (debounce) {
            this.writeInternal = isNumber(debounce) ?
                lodashDebounce(this.writeInternal, debounce) :
                lodashDebounce(this.writeInternal, debounce.interval, debounce);
        }
    }

    /**
     * Read data at a path
     */
    read() {
        return get(this.readRaw(), this.path);
    }

    /**
     * Save data at a path
     * @param {*} data  - data to be written to the path, must be serializable to JSON.
     */
    write(data) {
        this.writeInternal(data);
    }

    /**
     * Clear any state saved by this object at a path
     */
    clear(path = this.path) {
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
    writeInternal(data) {
        const obj = cloneDeep(this.readRaw());
        set(obj, this.path, data);
        this.writeRaw(obj);
    }

    writeRaw(obj) {}
    readRaw() {}
    clearRaw() {}
}

/**
 * @typedef {Object} PersistOptions
 * @property {string} path - Dot delimited path to store state.
 * @property {(number|object)} [debounce] - Debounce interval in ms, or a lodash debounce config.
 * @property {string} [type] - Type of PersistenceProvider to create. If not provided, defaulted based
 *      on the presence of `prefKey`, `localStorageKey`, `dashViewModel`, `getData` and `setData`.
 * @property {string} [prefKey] - Predefined Hoist application Preference key used to store state.
 * @property {string} [localStorageKey] - Browser local storage key used to store state.
 * @property {DashViewModel} [dashViewModel] - DashViewModel used to read / write view state.
 * @property {function} [getData] - Function returning blob of data to be used for reading state.
 *      Ignored if `prefKey`, `localStorageKey` or `dashViewModel` are provided.
 * @property {function} [setData] - Function to be used to write blob of data representing state.
 *      Ignored if `prefKey`, `localStorageKey` or `dashViewModel` are provided.
 */