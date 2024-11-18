/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistService, LoadSpec, PlainObject, XH} from '@xh/hoist/core';
import {pickBy} from 'lodash';

export interface JsonBlob {
    /** Either null for private blobs or special token "*" for globally shared blobs. */
    acl: string;
    /** True if this blob has been archived (soft-deleted). */
    archived: boolean;
    /** Timestamp indicating when this blob was archived, or special value `0` if not archived. */
    archivedDate: number;
    dateCreated: number;
    description: string;
    /** @internal database ID for this blob. Favor token instead. */
    id: number;
    lastUpdated: number;
    lastUpdatedBy: string;
    /** Optional application-specific metadata. */
    meta: PlainObject | unknown[];
    name: string;
    /** Username of the blob's creator / owner. */
    owner: string;
    /** Primary unique identifier for getting, updating, and archiving blobs. */
    token: string;
    /**
     * Application defined type for this blob. Used as a discriminator when querying blobs related
     * to a particular use-case within an application.
     */
    type: string;
    /**
     * Current JSON value of this blob - its contents or data. Will be undefined for blob stubs
     * returned by `listAsync` if `includeValue` was false.
     */
    value?: any;
}

/**
 * Service to read and set chunks of user-specific JSON persisted via Hoist Core's JSONBlob class.
 *
 * This service is intended as a general, lightweight utility for persisting small bundles of
 * unstructured data that might not warrant a full-blown domain object, but which still need to be
 * persisted back to the database.
 */
export class JsonBlobService extends HoistService {
    static instance: JsonBlobService;

    /** Retrieve a single JSONBlob by its unique token. */
    async getAsync(token: string): Promise<JsonBlob> {
        return XH.fetchJson({
            url: 'xh/getJsonBlob',
            params: {token}
        });
    }

    /** Retrieve all blobs of a particular type that are visible to the current user. */
    async listAsync(spec: {
        type: string;
        includeValue?: boolean;
        loadSpec?: LoadSpec;
    }): Promise<JsonBlob[]> {
        const {type, includeValue, loadSpec} = spec;
        return XH.fetchJson({
            url: 'xh/listJsonBlobs',
            params: {type, includeValue},
            loadSpec
        });
    }

    /** Persist a new JSONBlob back to the server. */
    async createAsync({
        acl,
        description,
        type,
        meta,
        name,
        value
    }: Partial<JsonBlob>): Promise<JsonBlob> {
        return XH.fetchJson({
            url: 'xh/createJsonBlob',
            params: {
                data: JSON.stringify({type, name, acl, value, meta, description})
            }
        });
    }

    /** Modify mutable properties of an existing JSONBlob, as identified by its unique token. */
    async updateAsync(
        token: string,
        {acl, description, meta, name, value}: Partial<JsonBlob>
    ): Promise<JsonBlob> {
        const update = pickBy({acl, description, meta, name, value}, (v, k) => v !== undefined);
        return XH.fetchJson({
            url: 'xh/updateJsonBlob',
            params: {
                token,
                update: JSON.stringify(update)
            }
        });
    }

    /** Archive (soft-delete) an existing JSONBlob, as identified by its unique token. */
    async archiveAsync(token: string): Promise<JsonBlob> {
        return XH.fetchJson({
            url: 'xh/archiveJsonBlob',
            params: {token}
        });
    }
}
