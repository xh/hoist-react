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
        return XH.fetchJson({
            url: 'jsonBlob/get',
            params: {id}
        });
    }

    /** Return all current user's blobs for given type */
    async listAsync({type}) {
        return XH.fetchJson({
            url: 'jsonBlob/list',
            params: {type}
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
        return XH.fetchJson({
            url: 'jsonBlob/create',
            params: {
                type,
                name,
                value: JSON.stringify(value),
                description
            }
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
        return XH.fetchJson({url: 'jsonBlob/update', params});
    }

    async deleteAsync(id) {
        return XH.fetchJson({
            url: 'jsonBlob/delete',
            params: {id}
        });
    }

}