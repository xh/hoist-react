/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {UrlStore} from '@xh/hoist/data';
import '@xh/hoist/desktop/register';
import {filter, keyBy, mapValues} from 'lodash';
import {RestField} from './RestField';

/**
 * Store with additional support for RestGrid.
 *
 * Provides support for lookups, and CRUD operations on records.
 */
export class RestStore extends UrlStore {

    _lookupsLoaded = false;

    /**
     * @param {Object} c - RestStore configuration.
     * @param {string} c.url - URL from which to load data.
     * @param {?string} [c.dataRoot] - Key of root node for records in returned data object. Null if data objects are at the root
     * @param {boolean} [c.reloadLookupsOnLoad] - Whether lookups should be loaded each time
     *      new data is loaded or updated by this client.
     * @param {...*} - Additional arguments to pass to UrlStore.
     */
    constructor({url, dataRoot = 'data', reloadLookupsOnLoad = false, ...urlStoreArgs}) {
        super({url, dataRoot, ...urlStoreArgs});
        this.reloadLookupsOnLoad = reloadLookupsOnLoad;
    }

    get defaultFieldClass() {
        return RestField;
    }

    async doLoadAsync(loadSpec) {
        await this.ensureLookupsLoadedAsync();
        return super.doLoadAsync(loadSpec);
    }

    async deleteRecordAsync(rec) {
        const {url} = this;

        return XH.fetchJson({
            url: `${url}/${rec.id}`,
            method: 'DELETE'
        }).then(() => {
            this.updateData({remove: [rec.id]});
        }).linkTo(
            this.loadModel
        );
    }

    async bulkDeleteRecordsAsync(records) {
        const {url} = this,
            ids = records.map(it => it.id),
            resp = await XH.fetchJson({
                url: `${url}/bulkDelete`,
                params: {ids}
            }).linkTo(
                this.loadModel
            );

        await this.loadAsync();
        return resp;
    }

    async addRecordAsync(rec) {
        return this.saveRecordInternalAsync(rec, true)
            .linkTo(this.loadModel);
    }

    async saveRecordAsync(rec) {
        return this.saveRecordInternalAsync(rec, false)
            .linkTo(this.loadModel);
    }

    async bulkUpdateRecordsAsync(ids, newParams) {
        const {url} = this,
            resp = await XH.fetchService.putJson({
                url: `${url}/bulkUpdate`,
                body: {ids, newParams}
            }).linkTo(
                this.loadModel
            );

        await this.loadAsync();
        return resp;
    }

    editableDataForRecord(record) {
        const {data} = record,
            editable = keyBy(filter(this.fields, 'editable'), 'name');
        return mapValues(editable, (v, k) => data[k]);
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    async saveRecordInternalAsync(rec, isAdd) {
        let {url, dataRoot} = this;
        if (!isAdd) url += '/' + rec.id;

        // Only include editable fields in the request data
        const data = {id: rec.id, ...this.editableDataForRecord(rec)};

        const fetchMethod = isAdd ? 'postJson' : 'putJson',
            response = await XH.fetchService[fetchMethod]({url, body: {data}}),
            responseData = (dataRoot) ? response[dataRoot] : response;

        this.updateData([responseData]);

        await this.ensureLookupsLoadedAsync();

        return this.getById(responseData.id);
    }

    async ensureLookupsLoadedAsync() {
        if (!this._lookupsLoaded || this.reloadLookupsOnLoad) {
            const lookupFields = this.fields.filter(it => !!it.lookupName);
            if (lookupFields.length) {
                const lookupData = await XH.fetchJson({url: `${this.url}/lookupData`});
                lookupFields.forEach(f => {
                    f.lookup = lookupData[f.lookupName];
                });
            }
            this._lookupsLoaded = true;
        }
    }
}
