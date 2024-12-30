/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {PlainObject, XH} from '@xh/hoist/core';
import {StoreRecord, StoreRecordId, UrlStore, UrlStoreConfig} from '@xh/hoist/data';
import '@xh/hoist/desktop/register';
import {filter, isNil, keyBy, mapValues} from 'lodash';
import {RestField, RestFieldSpec} from './RestField';

export interface RestStoreConfig extends UrlStoreConfig {
    /** Field names, configs, or instances. */
    fields?: Array<string | RestFieldSpec | RestField>;

    /** Whether lookups should be loaded each time new data is loaded or updated by this client. */
    reloadLookupsOnLoad?: boolean;
}

/**
 * Store with additional support for RestGrid.
 * Provides support for lookups, and CRUD operations on records.
 */
export class RestStore extends UrlStore {
    declare fields: RestField[];
    reloadLookupsOnLoad: boolean;
    private lookupsLoaded = false;

    constructor({url, dataRoot = 'data', reloadLookupsOnLoad = false, ...rest}: RestStoreConfig) {
        super({url, dataRoot, ...rest});
        this.reloadLookupsOnLoad = reloadLookupsOnLoad;
    }

    override get defaultFieldClass() {
        return RestField;
    }

    override async doLoadAsync(loadSpec) {
        await this.ensureLookupsLoadedAsync();
        return super.doLoadAsync(loadSpec);
    }

    async deleteRecordAsync(rec: StoreRecord) {
        const {url} = this;

        return XH.fetchJson({
            url: `${url}/${rec.id}`,
            method: 'DELETE'
        })
            .then(() => {
                this.updateData({remove: [rec.id]});
            })
            .linkTo(this.loadModel);
    }

    async bulkDeleteRecordsAsync(records: StoreRecord[]) {
        const {url} = this,
            ids = records.map(it => it.id),
            resp = await XH.fetchJson({
                url: `${url}/bulkDelete`,
                params: {ids}
            }).linkTo(this.loadModel);

        await this.loadAsync();
        return resp;
    }

    async addRecordAsync(rec: {id?: StoreRecordId; data: PlainObject}) {
        return this.saveRecordInternalAsync(rec, true).linkTo(this.loadModel);
    }

    async saveRecordAsync(rec: {id: StoreRecordId; data: PlainObject}) {
        return this.saveRecordInternalAsync(rec, false).linkTo(this.loadModel);
    }

    async bulkUpdateRecordsAsync(ids: StoreRecordId[], newParams: PlainObject) {
        const {url} = this,
            resp = await XH.fetchService
                .putJson({
                    url: `${url}/bulkUpdate`,
                    body: {ids, newParams}
                })
                .linkTo(this.loadModel);

        await this.loadAsync();
        return resp;
    }

    editableDataForRecord(record: {data: PlainObject}): PlainObject {
        const {data} = record,
            editable = keyBy(filter(this.fields, 'editable'), 'name');
        return mapValues(editable, (v, k) => data[k]);
    }

    override getField(name: string): RestField {
        return super.getField(name) as RestField;
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    private async saveRecordInternalAsync(rec: {id?: StoreRecordId; data: PlainObject}, isAdd) {
        let {url, dataRoot} = this,
            {id} = rec;

        if (!isAdd) url += '/' + id;

        // Only include editable fields in the request data
        const data = this.editableDataForRecord(rec);
        if (!isNil(id)) data.id = id;

        const fetchMethod = isAdd ? 'postJson' : 'putJson',
            response = await XH.fetchService[fetchMethod]({url, body: {data}}),
            responseData = dataRoot ? response[dataRoot] : response;

        this.updateData([responseData]);

        await this.ensureLookupsLoadedAsync();

        return this.getById(responseData.id);
    }

    private async ensureLookupsLoadedAsync() {
        if (!this.lookupsLoaded || this.reloadLookupsOnLoad) {
            const lookupFields = this.fields.filter(it => !!it.lookupName);
            if (lookupFields.length) {
                const lookupData = await XH.fetchJson({url: `${this.url}/lookupData`});
                lookupFields.forEach(f => {
                    f.lookup = lookupData[f.lookupName];
                });
            }
            this.lookupsLoaded = true;
        }
    }
}
