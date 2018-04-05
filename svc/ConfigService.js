/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {BaseService} from './BaseService';
import {XH} from 'hoist/core';
import {cloneDeep} from 'lodash';

/**
 * Service to read values of soft-config keys that have been made available to the client app
 * via the `clientVisible` flag on the Hoist Core AppConfig object. These values can
 * be updated via the Admin UI to allow for on-the-fly or per-environment configuration.
 */
export class ConfigService extends BaseService {

    _data = {};

    async initAsync() {
        this._data = await XH.fetchJson({url: 'hoistImpl/getConfig'});
    }

    /**
     * Get the configured value for a given key.
     *
     * @param {string} key
     * @param {object} [defaultValue] - value to return if the configuration key is not found - i.e.
     *      the config has not been created on the server - instead of throwing. Use sparingly!
     *      In general it's better to not provide defaults here, but instead keep configs up-to-date
     *      via the Admin client and have it be obvious when a config is missing.
     * @returns {*}
     */
    get(key, defaultValue) {
        const data = this._data;
        if (data.hasOwnProperty(key)) {
            return cloneDeep(data[key]);
        }
        if (defaultValue === undefined) {
            throw XH.exception(`Config key not found: '${key}'`);
        }
        return defaultValue;
    }

}
