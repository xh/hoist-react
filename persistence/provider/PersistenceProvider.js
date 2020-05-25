/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH, ReactiveSupport} from '@xh/hoist/core';
import {LocalStorageProvider, PrefProvider, DashViewProvider} from '../index';
import {cloneDeep, get, set, unset, isString} from 'lodash';

/**
 * Object that can be used by a component to store/restore state for from a
 * given persistent location.  This is an abstract class.
 *
 * This object is designed to be called very rapidly, and should immediately incorporate any
 * writes into the readable state.  If buffering or caching is required, it is the responsibility
 * of this object to do so.
 */
@ReactiveSupport
export class PersistenceProvider {

    get isPersistenceProvider() {return true}

    /**
     * Construct an instance of this class.
     *
     * @param {Object|string} spec - if specified as a string, the string will be assumed to
     *      be the key for a provider of type 'localStorage'.
     * @property {string} spec.type - one of 'pref'|'localStorage'|'dashView'
     * @property {*} spec.rest - Additional provider specific arguments. See Provider
     *      constructor for more details.
     * @return {PersistenceProvider}
     */
    static create(spec) {
        if (isString(spec)) {
            spec = {type: 'localStorage', key: spec};
        }
        switch (spec.type) {
            case 'pref':
                return new PrefProvider(spec);
            case 'localStorage':
                return new LocalStorageProvider(spec);
            case `dashView`:
                return new DashViewProvider(spec);
            default:
                throw XH.exception(`Unknown Persistence Provider for type: ${spec.type}`);
        }
    }

    /**
     * Read data at a path
     * @param {string} path - dot delimited path.
     */
    read(path) {
        return get(this.readRaw(), path);
    }

    /**
     * Save data at a path
     * @param {string} path - dot delimited path.
     * @param {*} data  - data to be written to the path.
     *      must be serializable to json.
     */
    write(path, data) {
        const obj = cloneDeep(this.readRaw());
        set(obj, path, data);
        this.writeRaw(obj);
    }

    /**
     * Clear any state saved by this object at a path
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