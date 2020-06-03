/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH, ReactiveSupport} from '@xh/hoist/core';
import {LocalStorageProvider, PrefProvider, DashViewProvider} from '../index';
import {cloneDeep, get, set, unset} from 'lodash';

/**
 * Abstract superclass for adaptor objects used by models and components to (re)store state to and
 * from a persistent location, typically a Hoist preference or key within browser local storage.
 *
 * This object is designed to be called very rapidly, and should immediately incorporate any
 * writes into the readable state. If buffering or caching is required, it is the responsibility
 * of this class's concrete implementations to handle appropriately.
 *
 * @see PrefProvider - stores state in a predefined Hoist application Preference.
 * @see LocalStorageProvider - stores state in browser local storage under a configured key.
 * @see DashViewProvider - stores state with other Dashboard-specific state via a `DashViewModel`.
 */
@ReactiveSupport
export class PersistenceProvider {

    get isPersistenceProvider() {return true}

    /**
     * Construct an instance of this class.
     *
     *  @param {Object} spec
     * @property {string} [spec.type] - one of 'pref'|'localStorage'|'dashView'.
     *      If not provided, this method will autodetect the type based on the presence of either a
     *      'prefKey', 'localStorageKey', or 'dashViewModel' argument.
     * @property {*} spec.rest - Additional provider specific arguments. See implementation class
     *      constructors for more details.
     * @return {PersistenceProvider}
     */
    static create({type, ...rest}) {
        if (!type && rest.prefKey) type = 'pref';
        if (!type && rest.localStorageKey) type = 'localStorage';
        if (!type && rest.dashViewModel) type = 'dashView';

        switch (type) {
            case 'pref':
                return new PrefProvider(rest);
            case 'localStorage':
                return new LocalStorageProvider(rest);
            case `dashView`:
                return new DashViewProvider(rest);
            default:
                throw XH.exception(`Cannot create PersistenceProvider for unexpected type: ${type}`);
        }
    }
    /**
     * Return an instance of this class, creating if needed.
     * @param {Object} spec - PersistenceProvider, or configuration for one.
     * @return {PersistenceProvider}
     */
    static getOrCreate(spec) {
        return spec.isPersistenceProvider ? spec : this.create(spec);
    }

    /**
     * Read data at a path.
     * @param {string} path - dot delimited path.
     */
    read(path) {
        return get(this.readRaw(), path);
    }

    /**
     * Save data at a path.
     * @param {string} path - dot delimited path.
     * @param {*} data  - data to be written to the path, must be serializable to JSON.
     */
    write(path, data) {
        const obj = cloneDeep(this.readRaw());
        set(obj, path, data);
        this.writeRaw(obj);
    }

    /**
     * Clear any state saved by this object at a path.
     * @param {string} path - dot delimited path.
     */
    clear(path) {
        const obj = cloneDeep(this.readRaw());
        unset(obj, path);
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
    writeRaw(obj) {}
    readRaw() {}
    clearRaw() {}
}