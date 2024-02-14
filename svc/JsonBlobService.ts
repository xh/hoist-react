/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {XH, HoistService} from '@xh/hoist/core';

/**
 * Service to read and set chunks of user-specific JSON persisted via Hoist Core's JSONBlob class.
 */
export class JsonBlobService extends HoistService {
    static instance: JsonBlobService;

    async getAsync(token) {
        return XH.fetchJson({
            url: 'xh/getJsonBlob',
            params: {token}
        });
    }

    /**
     * Return the list of blobs visible to the current user.
     *
     * @param type - reference key for which type of data to list.
     * @param includeValue - true to include the full value string for each blob.
     */
    async listAsync({type, includeValue}: {type: string; includeValue?: boolean}) {
        return XH.fetchJson({
            url: 'xh/listJsonBlobs',
            params: {type, includeValue}
        });
    }

    /** Persist a new JSONBlob back to the server. */
    async createAsync({
        type,
        name,
        value,
        meta,
        description
    }: {
        type: string;
        name: string;
        description?: string;
        value: any;
        meta?: any;
    }) {
        return XH.fetchJson({
            url: 'xh/createJsonBlob',
            params: {
                data: JSON.stringify({type, name, value, meta, description})
            }
        });
    }

    /** Modify an existing JSONBlob, as identified by its unique token. */
    async updateAsync(
        token: string,
        {
            name,
            value,
            meta,
            description
        }: {name?: string; value?: any; meta?: any; description?: string}
    ) {
        return XH.fetchJson({
            url: 'xh/updateJsonBlob',
            params: {
                token,
                update: JSON.stringify({name, value, meta, description})
            }
        });
    }

    /** Archive (soft-delete) an existing JSONBlob, as identified by its unique token. */
    async archiveAsync(token: string) {
        return XH.fetchJson({
            url: 'xh/archiveJsonBlob',
            params: {token}
        });
    }
}
