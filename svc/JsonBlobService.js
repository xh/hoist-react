/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {XH, HoistService} from '@xh/hoist/core';
import {castArray} from 'lodash';

/**
 * Service to read and set user-specific named json values.
 *
 * Server-side support is provided by hoist-core.
 */
@HoistService
export class JsonBlobService {

    async getAsync(id) {
        return XH.fetchJson({
            url: 'xh/getJsonBlob',
            params: {id}
        });
    }

    /**
     * Return a list of blobs.
     *
     * @param {string} type - reference key for which type of data to list.
     * @param {(string|string[])} [owners] - owner(s) for whom to return blobs. Defaults to current user.
     * @param {boolean} [includeValue] - true to include the full value string for each blob.
     */
    async listAsync({
        type,
        owners = XH.getUsername(),
        includeValue
    }) {
        owners = JSON.stringify(castArray(owners));
        return XH.fetchJson({
            url: 'xh/listJsonBlobs',
            params: {type, owners, includeValue}
        });
    }

    /**
     * Saves a new json blob to the server
     *
     * @param {string} type - reference key for which type of data this is.
     * @param {string} name.
     * @param {(Object|Array)} value - json serializable data to saved.
     * @param {string} [owner] - defaults to current user.
     * @param {string} [description] - optional description.
     */
    async createAsync({
        type,
        name,
        value,
        owner = XH.getUsername(),
        description
    }) {
        value = JSON.stringify(value);
        return XH.fetchJson({
            url: 'xh/createJsonBlob',
            params: {type, name, value, owner, description}
        });
    }

    /**
     * Modifies an existing json blob
     *
     * @param {int} id.
     * @param {Object} data - modifications to make.
     * @param {string} [data.name]
     * @param {(Object|Array)} [data.value]
     * @param {string} [data.description]
     */
    async updateAsync(id, {name, value, description}) {
        const params = {id};
        if (name) params.name = name;
        if (value) params.value = JSON.stringify(value);
        if (description) params.description = description;
        return XH.fetchJson({url: 'xh/updateJsonBlob', params});
    }

    async deleteAsync(id) {
        return XH.fetchJson({
            url: 'xh/deleteJsonBlob',
            params: {id}
        });
    }

}