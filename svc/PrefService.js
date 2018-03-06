/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {BaseService} from './BaseService';
import {cloneDeep, debounce, isEmpty, isEqual} from 'lodash';
import {XH} from 'hoist/core';
import {SECONDS} from 'hoist/utils/DateTimeUtils';

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

    get(key, defaultValue) {
        const data = this._data;
        let ret = defaultValue;

        if (data.hasOwnProperty(key)) {
            ret = data[key].value;
        }

        if (ret === undefined) throw XH.exception(`Preference key not found: '${key}'`);

        return cloneDeep(ret);
    }

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
        this.fireEvent('prefChange', key, value, oldVal);
    }

    async pushAsync(key, value) {
        this.validateBeforeSet(key);
        this.set(key, value);
        return this.pushPendingAsync();
    }

    clearLocalValues() {
        XH.localStorageService.remove(this._localStorageKey);
    }

    async clearAllAsync() {
        this.clearLocalValues();
        await XH.fetchJson({url: 'hoistImpl/clearPrefs'});
        return this.loadPrefsAsync();
    }

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
                data[key].value = !isEmpty(localPrefs[key]) ? localPrefs[key] : data[key].defaultValue;
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
}
