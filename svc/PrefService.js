/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {debounce, isNil, isEqual, isEmpty, pickBy, map, cloneDeep, forEach} from 'lodash';
import {XH, HoistService} from '@xh/hoist/core';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {throwIf, deepFreeze} from '@xh/hoist/utils/js';

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
@HoistService
export class PrefService {

    _data = {};
    _updates = {};
    _localStorageKey = 'localPrefs';

    constructor() {
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

        throwIf(ret === undefined, `Preference key not found: '${key}'`);
        return ret;
    }

    /**
     * Set a preference value for the current user.
     * Typically accessed via convenience alias `XH.setPref()`.
     *
     * Values are validated client-side to ensure they (probably) are of the correct data type.
     *
     * Values are saved to the server (or local storage) in an asynchronous and debounced manner.
     * See pushAsync() and pushPendingAsync()
     *
     * @param {string} key
     * @param {*} value - the new value to save.
     */
    set(key, value) {
        this.validateBeforeSet(key, value);

        const oldValue = this.get(key);
        if (isEqual(oldValue, value)) return;

        // Change local value to sanitized copy and fire.
        value = deepFreeze(cloneDeep(value));
        this._data[key].value = value;

        // Schedule serialization to storage
        this._updates[key] = value;
        this.pushPendingBuffered();
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
        this.validateBeforeSet(key, value);
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
        await XH.fetchJson({
            url: 'xh/clearPrefs',
            params: {clientUsername: XH.getUsername()}
        });
        return this.loadPrefsAsync();
    }

    /**
     * Push any pending buffered updates to persist newly set values to server or local storage.
     * Called automatically by this app on page unload to avoid dropping changes when e.g. a user
     * changes and option and then immediately hits a (browser) refresh.
     * @returns {Promise}
     */
    async pushPendingAsync() {
        const updates = this._updates;

        if (isEmpty(updates)) return;

        // clear obj state immediately to allow picking up next batch during async operation
        this._updates = {};

        const remoteUpdates = pickBy(updates, (v, k) => !this.isLocalPreference(k)),
            localUpdates = pickBy(updates, (v, k) => this.isLocalPreference(k));

        if (!isEmpty(localUpdates)) {
            XH.localStorageService.apply(this._localStorageKey, localUpdates);
        }

        if (!isEmpty(remoteUpdates)) {
            await XH.fetchJson({
                url: 'xh/setPrefs',
                params: {
                    updates: JSON.stringify(remoteUpdates),
                    clientUsername: XH.getUsername()
                }
            });
        }
    }


    //-------------------
    //  Implementation
    //-------------------
    async loadPrefsAsync() {
        const data = await XH.fetchJson({
            url: 'xh/getPrefs',
            params: {clientUsername: XH.getUsername()}
        });
        forEach(data, v => {
            deepFreeze(v.value);
            deepFreeze(v.defaultValue);
        });
        this._data = data;
        this.syncLocalPrefs();
    }

    syncLocalPrefs() {
        const localPrefs = XH.localStorageService.get(this._localStorageKey, {}),
            data = this._data;

        this.cleanLocalPrefs(localPrefs);

        for (let key in data) {
            if (data[key].local) {
                data[key].value = !isNil(localPrefs[key]) ?
                    deepFreeze(cloneDeep(localPrefs[key])) :
                    data[key].defaultValue;
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

        throwIf(
            hasRemoveValue && !this.isLocalPreference(key),
            `${key} is not a local preference.`
        );

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


        throwIf(!pref, `Cannot set preference ${key}: not found`);

        throwIf(value === undefined, `Cannot set preference ${key}: value not defined`);

        throwIf(
            !this.valueIsOfType(value, pref.type),
            `Cannot set preference ${key}: must be of type ${pref.type}`
        );
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
}
