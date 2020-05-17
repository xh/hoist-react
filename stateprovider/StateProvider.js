/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {LocalStorageProvider, PrefProvider, DashViewProvider, TransientProvider} from './';

/**
 *
 * Object that be used by a component to store/restore state for the component from a
 * given location.  This is abstract class.
 *
 * This object is designed to be called very rapidly, and should immediately incorporate any
 * writes into the readable state.  If buffering or caching is required, it is the responsibility
 * of this object to do so.
 */
export class StateProvider {

    key;
    subKey;

    /**
     * Construct a an instance of this class.
     *
     * @param {Object} config
     * @param {string} config.type - one of 'pref'|'localState'|'dashView'|'transient'
     * @param {string} [config.key] - key to use for storing state.
     * @param {string} [config.subKey] -- optional sub-key.  Sub-property at which
     *      state should be stored within the main object referenced by key.  For use
     *      only when key refers to a JSON object.
     * @param {...} [config.rest] -- additional arguments required by concrete subclass.
     *
     * @return {StateProvider}
     */
    static create(conf = {}) {
        if (!conf.type) return new TransientProvider(conf);
        switch (conf.type) {
            case 'pref':
                return new PrefProvider(conf);
            case 'localStorage':
                return new LocalStorageProvider(conf);
            case `dashView`:
                return new DashViewProvider(conf);
            case `transient`:
                return new TransientProvider(conf);
            default:
                throw XH.exception(`Unknown StateProvider type: ${conf.type}`);
        }
    }

    /**
     * @param {Object} config
     * @param {string} [config.key] - key to use for storing state.
     * @param {string} [config.subKey] -- optional subkey.  Property at which
     * state should be stored in the main object referenced by key.  For use
     * only when key refers to a JSON object.
     */
    constructor({key = null, subKey = null} = {}) {
        this.key = key;
        this.subKey = subKey;
    }

    /**
     * Read the state for this object.
     *
     * Applications should *not* assume this is a mutable object, and in fact,
     * it may be frozen.  If a mutable version is required, the value returned by
     * this object should be cloned.
     *
     * @returns {*} - null if the state has not been set since last clear.
     */
    readState() {
        const val = this.readDataImpl(),
            {subKey} = this;
        return val && subKey ? (val[subKey] ?? null) : val;
    }

    /**
     * Write the state for this object.
     * @param {*} state
     */
    writeState(state) {
        let newState = state,
            {subKey} = this;

        if (subKey) {
            newState = this.readDataImpl() ?? {};
            newState[subKey] = state;
        }
        return this.writeDataImpl(newState);
    }

    /**
     * Clear any state saved by this object.
     */
    clearState() {
        const val = this.readDataImpl(),
            {subKey} = this;

        if (!val) return;
        if (!subKey) {
            this.clearDataImpl();
        } else {
            delete val[subKey];
            this.writeDataImpl(val);
        }
    }

    //-----------------------------
    // Protected template Methods
    //------------------------------
    // Write data to key.
    writeDataImpl(data) {}

    // Return current data at the key.
    readDataImpl() {}

    // Clear data at key.
    clearDataImpl() {}
}