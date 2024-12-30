/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistService, XH} from '@xh/hoist/core';
import {deepFreeze, throwIf} from '@xh/hoist/utils/js';
import {keys} from 'lodash';

/**
 * Service to read soft-configuration values.
 *
 * Server-side configuration support is provided by hoist-core. AppConfigs must be predefined on the
 * server (they can be managed by the Admin console) and are referenced by their string key. These
 * entries can then be changed on the fly or given per-environment values that allow the app to
 * adjust without requiring a code change or redeployment.
 *
 * Note that for a config to be available here on the client, it must have its `clientVisible` flag
 * set to true. This is to provide support for configurations that should *not* be sent down for
 * possible inspection by end users.
 *
 * Note that this service does *not* currently attempt to reload or update configs once the client
 * application has loaded. A refresh of the application is required to load new entries.
 */
export class ConfigService extends HoistService {
    static instance: ConfigService;

    private _data = {};

    override async initAsync() {
        this._data = await XH.fetchJson({url: 'xh/getConfig'});
        deepFreeze(this._data);
    }

    /**
     * Get the list of available keys.
     */
    get list(): string[] {
        return keys(this._data);
    }

    /**
     * Get the configured value for a given key. Typically accessed via `XH.getConf()` alias.
     *
     * @param key - identifier of the config to return.
     * @param defaultValue - value to return if the configuration key is not found - i.e. the
     *      config has not been created on the server - instead of throwing. Use sparingly! In
     *      general, it's better to not provide defaults here, but instead keep entries up-to-date
     *      via the Admin client and have it be obvious when one is missing.
     * @returns the soft-configured value.
     */
    get(key: string, defaultValue?: any): any {
        const data = this._data;

        if (data.hasOwnProperty(key)) {
            return data[key];
        }

        throwIf(defaultValue === undefined, `Config key not found: '${key}'`);
        return defaultValue;
    }
}
