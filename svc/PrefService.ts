/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {CallContextLike, HoistService, InitContext, XH} from '@xh/hoist/core';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {debounced, deepFreeze, throwIf} from '@xh/hoist/utils/js';
import {cloneDeep, forEach, isEmpty, isEqual} from 'lodash';
import {terminationSafePostJson} from './impl/Fetch';

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
    override telemetryPrefix = 'xh.client.prefs';

    static instance: PrefService;
    private _data: Record<string, PrefEntry> = {};
    private _updates: Record<string, any> = {}; // undefined indicates unset

    override async initAsync(ctx: InitContext) {
        // Flush on page teardown while the page is still alive.
        this.addReaction({
            track: () => XH.pageState,
            run: () => {
                if (!XH.pageIsVisible) this.pushPendingAsync();
            }
        });
        return this.loadPrefsAsync(ctx);
    }

    /**
     * Check to see if a given preference has been *defined*.
     */
    hasKey(key: string): boolean {
        return this._data.hasOwnProperty(key);
    }

    /**
     * Check whether the current user has an explicit value on file for the given preference, vs.
     * receiving the preference's server-side default value.
     *
     * @param key - unique key used to identify the pref.
     */
    isSet(key: string): boolean {
        this.ensureKeyExists(key);
        return !!this._data[key].isSet;
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
        const pref = this._data[key];
        pref.value = value;
        pref.isSet = true;

        // Schedule serialization to storage
        this._updates[key] = value;
        this.pushPendingBuffered();
    }

    /**
     * Restore a preference to its default value, clearing the user's explicit value on the server.
     *
     * Unlike `set()`, this clears the user's explicit value rather than persisting the default as
     * one - so {@link isSet} will report `false` afterwards. Saved asynchronously (see `set()`).
     */
    unset(key: string) {
        this.ensureKeyExists(key);
        const pref = this._data[key];
        if (!pref.isSet && isEqual(pref.value, pref.defaultValue)) return;

        pref.value = pref.defaultValue;
        pref.isSet = false;

        // Schedule serialization to storage
        this._updates[key] = undefined;
        this.pushPendingBuffered();
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
     * Push any pending buffered updates to persist newly set values to the server.
     *
     * Not typically called by applications.  Called automatically by the framework after changes
     * and when page is hidden/terminated.
     */
    async pushPendingAsync() {
        const updates = this._updates;
        if (isEmpty(updates)) return;

        // Clear synchronously with the capture, so overlapping flushes cannot post twice.
        this._updates = {};

        // Partition into value updates and unsets.
        // On a core that predates unset support, fall back to persisting default
        const setPrefs = {},
            unsetKeys = [];
        forEach(updates, (value, key) => {
            const pref = this._data[key];
            if (value !== undefined) {
                setPrefs[key] = value;
            } else if (pref.hasOwnProperty('isSet')) {
                unsetKeys.push(key);
            } else {
                setPrefs[key] = pref.defaultValue;
            }
        });

        await this.runner()
            .span('update')
            .run(async ctx => {
                const clientUsername = XH.getUsername(),
                    tasks = [];
                if (!isEmpty(setPrefs)) {
                    tasks.push(
                        terminationSafePostJson(
                            {url: 'xh/setPrefs', body: setPrefs, params: {clientUsername}},
                            ctx
                        )
                    );
                }
                if (!isEmpty(unsetKeys)) {
                    tasks.push(
                        terminationSafePostJson(
                            {url: 'xh/unsetPrefs', body: unsetKeys, params: {clientUsername}},
                            ctx
                        )
                    );
                }
                await Promise.all(tasks);
            });
    }

    //-------------------
    //  Implementation
    //-------------------
    @debounced(5 * SECONDS)
    private pushPendingBuffered() {
        void this.pushPendingAsync();
    }

    private async loadPrefsAsync(ctx: CallContextLike) {
        await this.runner(ctx)
            .span('get')
            .run(async ctx => {
                const data = await XH.fetchJson(
                    {
                        url: 'xh/getPrefs',
                        params: {clientUsername: XH.getUsername()}
                    },
                    ctx
                );
                forEach(data, v => {
                    deepFreeze(v.value);
                    deepFreeze(v.defaultValue);
                });
                this._data = data;
            });
    }

    private ensureKeyExists(key: string) {
        throwIf(!this.hasKey(key), `Preference key not found: '${key}'`);
    }

    private validateBeforeSet(key: string, value: any) {
        this.ensureKeyExists(key);
        const pref = this._data[key];
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

interface PrefEntry {
    type: string;
    value: any;
    defaultValue: any;
    isSet: boolean;
}
