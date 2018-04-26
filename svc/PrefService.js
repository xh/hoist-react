/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {BaseService} from './BaseService';
import {cloneDeep, debounce, isNil, isEqual} from 'lodash';
import {XH} from 'hoist/core';
import {SECONDS} from 'hoist/utils/DateTimeUtils';

/**
 * Service to read and set user-specific preference values.
 *
 * Server-side preference support is provided by hoist-core. Preferences must be predefined on the
 * server (they can be managed via the Admin console) and are referenced by their string key. They
 * are assigned default values that apply to users who have yet to have a value set that is specific
 * to their account. Once set, however, the user will get their customized value instead of the
 * default going forwards.
 *
 * This could happen via an explicit option the user adjusts, or happen transparently based on a
 * natural user action or component integration (e.g. collapsing or resizing a `Resizable` that has
 * been configured with preference support).
 *
 * Preferences are persisted automatically back to the server by default so as to follow their user
 * across workstations. A `local` flag can be set on the preference definition, however, to persist
 * user values to local storage instead. This should be used for prefs that are more natural to
 * associate with a particular machine or browser (e.g. sizing or layout related options).
 */
export class PrefService extends BaseService {

    _data = null;
    _updates = {};
    _localStorageKey = 'localPrefs';

    constructor() {
        super();
        const pushFn = () => this.pushPendingAsync();
        window.addEventListener('unload', pushFn);
        this.pushPendingBuffered = debounce(pushFn, 5 * SECONDS);
    }

    async initAsync() {
        return this.loadPrefsAsync();
    }

    /**
     * Check to see if a given preference has been *defined*.
     * @param key
     */
    hasKey(key) {
        return this._data.hasOwnProperty(key);
    }

    /**
     * Get the value for a given key, either the user-specific value (if set) or the default.
     * Typically accessed via convenience alias `XH.getPref()`.
     *
     * @param {string} key
     * @param {*} [defaultValue] - value to return if the preference key is not found - i.e.
     *      the config has not been created on the server - instead of throwing. Use sparingly!
     *      In general it's better to not provide defaults here, but instead keep entries up-to-date
     *      via the Admin client and have it be obvious when one is missing.
     */
    get(key, defaultValue) {
        const data = this._data;
        let ret = defaultValue;

        if (data.hasOwnProperty(key)) {
            ret = data[key].value;
        }

        if (ret === undefined) throw XH.exception(`Preference key not found: '${key}'`);

        return cloneDeep(ret);
    }

    /**
     * Set a preference value for the current user.
     * Typically accessed via convenience alias `XH.setPref()`.
     *
     * Values for local preferences will immediately be saved to local storage. Values for server-
     * side preferences (the default) will be pushed to the server in a debounced manner. Both are
     * validated client-side to ensure they (probably) are of the correct data type.
     *
     * @param {string} key
     * @param {*} value - the new value to save
     * @fires PrefService#prefChange - if the preference value was actually modified
     */
    set(key, value) {
        this.validateBeforeSet(key, value);

        const oldVal = this.get(key);
        if (isEqual(oldVal, value)) return;

        this._data[key].value = value;

        if (this.isLocalPreference(key)) {
            XH.localStorageService.apply(this._localStorageKey, {[key]: value});
        } else {
            this._updates[key] = value;
            this.pushPendingBuffered();
        }
        this.fireEvent('prefChange', {key, value, oldVal});
    }

    /**
     * Set a preference value for the current user, and immediately trigger a sync to the server.
     *
     * Useful when important to verify that the preference has been fully round-tripped - e.g.
     * before making another call that relies on its updated value being read on the server.
     *
     * @param key
     * @param value
     * @returns {Promise}
     */
    async pushAsync(key, value) {
        this.validateBeforeSet(key);
        this.set(key, value);
        return this.pushPendingAsync();
    }

    /**
     * Reset all *local* preferences, reverting their effective values back to defaults.
     */
    clearLocalValues() {
        XH.localStorageService.remove(this._localStorageKey);
    }

    /**
     * Reset *all* preferences, reverting their effective values back to defaults.
     * @returns {Promise} - resolves when preferences have been cleared and defaults reloaded.
     */
    async clearAllAsync() {
        this.clearLocalValues();
        await XH.fetchJson({url: 'hoistImpl/clearPrefs'});
        return this.loadPrefsAsync();
    }

    /**
     * Push any pending buffered updates to persist newly set values for non-local preferences
     * back to the server. Called automatically by this server on page unload to avoid dropping
     * changes when e.g. a user changes and option and then immediately hits a (browser) refresh.
     * @returns {Promise}
     */
    async pushPendingAsync() {
        if (Object.keys(this._updates).length < 1) {
            return;
        }

        const response = await XH.fetchJson({
            url: 'hoistImpl/setPrefs',
            params: {updates: JSON.stringify(this._updates)}
        });

        Object.assign(this._data, response.preferences);
        this._updates = {};
    }


    //-------------------
    //  Implementation
    //-------------------
    async loadPrefsAsync() {
        this._data = await XH.fetchJson({url: 'hoistImpl/getPrefs'});
        this.syncLocalPrefs();
    }

    syncLocalPrefs() {
        const localPrefs = XH.localStorageService.get(this._localStorageKey, {}),
            data = this._data;

        this.cleanLocalPrefs(localPrefs);

        for (let key in data) {
            if (data[key].local) {
                data[key].value = !isNil(localPrefs[key]) ? localPrefs[key] : data[key].defaultValue;
            }
        }
    }

    cleanLocalPrefs(localPrefs) {
        const data = this._data;

        for (let pref in localPrefs) {
            if (!data.hasOwnProperty(pref)) this.removeLocalValue(pref);
        }
    }

    removeLocalValue(key) {
        const hasRemoveValue = this._data.hasOwnProperty(key);
        if (hasRemoveValue && !this.isLocalPreference(key)) throw XH.exception(`${key} is not a local preference.`);

        const localPrefs = XH.localStorageService.get(this._localStorageKey, {});

        delete localPrefs[key];

        if (hasRemoveValue) this._data[key].value = this._data[key].defaultValue;

        XH.localStorageService.set(this._localStorageKey, localPrefs);
    }

    isLocalPreference(key) {
        const pref = this._data[key];
        return pref && pref.local;
    }

    validateBeforeSet(key, value) {
        const pref = this._data[key];

        if (!pref) {
            throw XH.exception(`Cannot set preference ${key}: not found`);
        }

        if (value === undefined) {
            throw XH.exception(`Cannot set preference ${key}: value not defined`);
        }

        if (!this.valueIsOfType(value, pref.type)) {
            throw XH.exception(`Cannot set preference ${key}: must be of type ${pref.type}`);
        }
    }

    valueIsOfType(value, type) {
        const valueType = typeof value;

        switch (type) {
            case 'string':
                return valueType === 'string';
            case 'int':
            case 'long':
            case 'double':
                return valueType === 'number';
            case 'bool':
                return valueType === 'boolean';
            case 'json':
                return valueType === 'object';
            default:
                return false;
        }
    }

    /**
     * @event PrefService#prefChange
     * @type {Object}
     * @property {string} key - preference key / identifier that was changed
     * @property {*} oldValue - the prior value
     * @property {*} value - the new, just-set value
     */
}
