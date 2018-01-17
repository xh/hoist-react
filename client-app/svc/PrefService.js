/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2017 Extremely Heavy Industries Inc.
 */
import {BaseService} from './BaseService';
import {debounce} from 'lodash';
import {XH} from 'hoist';
import {SECONDS} from 'hoist/utils/DateTimeUtils';
import {deepClone} from 'hoist/utils/JsUtils';

export class PrefService extends BaseService {

    _data = null;
    _updates = {};

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
        if (data.hasOwnProperty(key)) {
            return deepClone(data[key]);
        }
        if (defaultValue === undefined) {
            throw XH.exception(`Preference key not found: '${key}'`);
        }
        return defaultValue;
    }

    set(key, value) {
        this.ensurePreferenceExists(key);

        if (value === undefined) throw XH.exception('Value is not defined');
        if (this._data[key] === value) return;

        const oldVal = this.get(key);
        this._data[key] = value;
        this._updates[key] = value;

        this.pushPendingBuffered();
        this.fireEvent('prefChange', key, value, oldVal);
    }

    async pushAsync(key, value) {
        this.ensurePreferenceExists(key);

        if (value === undefined) throw XH.exception('Value is not defined');
        if (this._data[key] === value) return;

        this.set(key, value);
        return this.pushPendingAsync();
    }

    async clearAllAsync() {
        await XH.fetchJson({url: 'hoistImpl/clearPrefs'});
        return this.loadPrefsAsync();
    }

    async pushPendingAsync() {
        if (Object.keys(this._updates) < 1) {
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
    }

    ensurePreferenceExists(key) {
        if (!this._data.hasOwnProperty(key)) {
            throw XH.exception(`Preference not found: '${key}'`);
        }
    }
}
