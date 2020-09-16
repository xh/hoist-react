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

    async getAsync(id) {
        const result = await XH.fetchJson({
            url: 'jsonBlob/get',
            params: {id}
        });
        return this.parseBlob(result);
    }

    /**
     * Return all current user's blobs for given type
     *
     * @param {string} type - reference key for which type of data to list.
     * @param {boolean} [includeValue] - true to include the full value string for each blob.
     */
    async listAsync({
        type,
        includeValue = false
    }) {
        const results = await XH.fetchJson({
            url: 'jsonBlob/list',
            params: {
                type,
                includeValue
            }
        });
        return results.map(it => this.parseBlob(it));
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
        const result = await XH.fetchJson({
            url: 'jsonBlob/create',
            params: {
                type,
                name,
                value: JSON.stringify(value),
                description
            }
        });
        return this.parseBlob(result);
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

        const result = await XH.fetchJson({url: 'jsonBlob/update', params});
        return this.parseBlob(result);
    }

    async deleteAsync(id) {
        return XH.fetchJson({
            url: 'jsonBlob/delete',
            params: {id}
        });
    }

    //--------------------
    // Implementation
    //--------------------
    parseBlob(blob) {
        if (blob?.value) blob.value = JSON.parse(blob.value);
        return blob;
    }

}
