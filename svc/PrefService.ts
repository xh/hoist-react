/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistService, XH} from '@xh/hoist/core';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {debounced, deepFreeze, throwIf} from '@xh/hoist/utils/js';
import {cloneDeep, forEach, isEmpty, isEqual, size} from 'lodash';

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
 * across workstations.
 */
export class PrefService extends HoistService {
    static instance: PrefService;

    private _data = {};
    private _updates = {};

    override async initAsync() {
        window.addEventListener('beforeunload', () => this.pushPendingAsync());
        await this.migrateLocalPrefsAsync();
        return this.loadPrefsAsync();
    }

    /**
     * Check to see if a given preference has been *defined*.
     */
    hasKey(key: string): boolean {
        return this._data.hasOwnProperty(key);
    }

    /**
     * Get the value for a given key, either the user-specific value (if set) or the default.
     * Typically accessed via the convenience alias {@link XH.getPref}.
     *
     * @param key - unique key used to identify the pref.
     * @param defaultValue - value to return if the preference key is not found - i.e.
     *      the config has not been created on the server - instead of throwing. Use sparingly!
     *      In general, it's better to not provide defaults here, but instead keep entries updated
     *      via the Admin client and have it be obvious when one is missing.
     */
    get(key: string, defaultValue?: any) {
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
     * Typically accessed via the convenience alias {@link XH.setPref}.
     *
     * Values are validated client-side to ensure they (probably) are of the correct data type.
     *
     * Values are saved to the server in an asynchronous and debounced manner.
     * See pushAsync() and pushPendingAsync()
     */
    set(key: string, value: any) {
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
     * Restore a preference to its default value.
     */
    unset(key: string) {
        // TODO: round-trip this to the server as a proper unset?
        this.set(key, this._data[key]?.defaultValue);
    }

    /**
     * Set a preference value for the current user, and immediately trigger a sync to the server.
     *
     * Useful when important to verify that the preference has been fully round-tripped - e.g.
     * before making another call that relies on its updated value being read on the server.
     */
    async pushAsync(key: string, value: any) {
        this.validateBeforeSet(key, value);
        this.set(key, value);
        return this.pushPendingAsync();
    }

    /**
     * Reset *all* preferences, reverting their effective values back to defaults.
     * @returns a Promise that resolves when preferences have been cleared and defaults reloaded.
     */
    async clearAllAsync() {
        await XH.fetchJson({
            url: 'xh/clearPrefs',
            params: {clientUsername: XH.getUsername()}
        });
        return this.loadPrefsAsync();
    }

    /**
     * Push any pending buffered updates to persist newly set values to server.
     * Called automatically by this app on page unload to avoid dropping changes when e.g. a user
     * changes and option and then immediately hits a (browser) refresh.
     */
    async pushPendingAsync() {
        const updates = this._updates;

        if (isEmpty(updates)) return;

        this._updates = {};

        await XH.fetchJson({
            url: 'xh/setPrefs',
            params: {
                updates: JSON.stringify(updates),
                clientUsername: XH.getUsername()
            }
        });
    }

    //-------------------
    //  Implementation
    //-------------------
    @debounced(5 * SECONDS)
    private pushPendingBuffered() {
        this.pushPendingAsync();
    }

    private async loadPrefsAsync() {
        const data = await XH.fetchJson({
            url: 'xh/getPrefs',
            params: {clientUsername: XH.getUsername()}
        });
        forEach(data, v => {
            deepFreeze(v.value);
            deepFreeze(v.defaultValue);
        });
        this._data = data;
    }

    private async migrateLocalPrefsAsync() {
        try {
            const key = 'localPrefs',
                updates = XH.localStorageService.get(key, {}),
                updateCount = size(updates);
            if (updateCount) {
                await XH.fetchJson({
                    url: 'xh/migrateLocalPrefs',
                    timeout: 5 * SECONDS,
                    params: {
                        clientUsername: XH.getUsername(),
                        updates: JSON.stringify(updates)
                    },
                    track: {
                        message: `Migrated ${updateCount} preferences`,
                        data: updates
                    }
                });
                XH.localStorageService.remove(key);
            }
        } catch (e) {
            XH.handleException(e, {showAlert: false});
        }
    }

    private validateBeforeSet(key, value) {
        const pref = this._data[key];
        throwIf(!pref, `Cannot set preference ${key}: not found`);
        throwIf(value === undefined, `Cannot set preference ${key}: value not defined`);
        throwIf(
            !this.valueIsOfType(value, pref.type),
            `Cannot set preference ${key}: must be of type ${pref.type}`
        );
    }

    private valueIsOfType(value, type) {
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
