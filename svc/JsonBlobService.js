/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {XH, HoistService} from '@xh/hoist/core';

/**
 * Service to read and set user-specific named json values.
 *
 * Server-side support is provided by hoist-core.
 */
@HoistService
export class JsonBlobService {

    async getAsync(token) {
        return XH.fetchJson({
            url: 'xh/getJsonBlob',
            params: {token}
        });
    }

    /**
     * Return the list of blobs visible to the current user.
     *
     * @param {string} type - reference key for which type of data to list.
     * @param {boolean} [includeValue] - true to include the full value string for each blob.
     */
    async listAsync({
        type,
        includeValue
    }) {
        return XH.fetchJson({
            url: 'xh/listJsonBlobs',
            params: {type, includeValue}
        });
    }

    /**
     * Saves a new json blob to the server
     *
     * @param {string} type - reference key for which type of data this is.
     * @param {string} name.
     * @param {(Object|Array)} value - json serializable data to saved.
     * @param {string} [description] - optional description.
     */
    async createAsync({
        type,
        name,
        value,
        description
    }) {
        value = JSON.stringify(value);
        return XH.fetchJson({
            url: 'xh/createJsonBlob',
            params: {type, name, value, description}
        });
    }

    /**
     * Modifies an existing json blob
     *
     * @param {string} token.
     * @param {Object} data - modifications to make.
     * @param {string} [data.name]
     * @param {(Object|Array)} [data.value]
     * @param {string} [data.description]
     */
    async updateAsync(token, {name, value, description}) {
        const params = {token};
        if (name) params.name = name;
        if (value) params.value = JSON.stringify(value);
        if (description) params.description = description;
        return XH.fetchJson({url: 'xh/updateJsonBlob', params});
    }

    /**
     * Deletes a json blob
     * @param {string} token.
     */
    async deleteAsync(token) {
        return XH.fetchJson({
            url: 'xh/deleteJsonBlob',
            params: {token}
        });
    }

}