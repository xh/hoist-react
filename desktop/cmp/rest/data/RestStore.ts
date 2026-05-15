/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {CallContext, LoadSpec, PlainObject} from '@xh/hoist/core';
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
    override telemetryPrefix = 'xh.client.restStore';

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

    override async doLoadAsync(loadSpec: LoadSpec) {
        return this.runOn(loadSpec)
            .newSpan('load')
            .run(async ctx => {
                await this.ensureLookupsLoadedAsync(ctx);
                return super.doLoadAsync(ctx.loadSpec);
            });
    }

    async deleteRecordAsync(rec: StoreRecord) {
        return this.rootSpan('delete')
            .run(async ctx => {
                const {url} = this;
                await ctx.fetchJson({url: `${url}/${rec.id}`, method: 'DELETE'});
                this.updateData({remove: [rec.id]});
            })
            .linkTo(this.loadObserver);
    }

    async bulkDeleteRecordsAsync(records: StoreRecord[]) {
        return this.rootSpan('bulkDelete')
            .run(ctx => {
                const {url} = this,
                    ids = records.map(it => it.id);
                return ctx.fetchJson({url: `${url}/bulkDelete`, params: {ids}});
            })
            .linkTo(this.loadObserver)
            .tap(() => this.loadAsync());
    }

    async addRecordAsync(rec: {id?: StoreRecordId; data: PlainObject}) {
        return this.saveRecordInternalAsync(rec, true).linkTo(this.loadObserver);
    }

    async saveRecordAsync(rec: {id: StoreRecordId; data: PlainObject}) {
        return this.saveRecordInternalAsync(rec, false).linkTo(this.loadObserver);
    }

    async bulkUpdateRecordsAsync(ids: StoreRecordId[], newParams: PlainObject) {
        return this.rootSpan('bulkUpdate')
            .run(ctx => {
                const {url} = this;
                return ctx.putJson({url: `${url}/bulkUpdate`, body: {ids, newParams}});
            })
            .linkTo(this.loadObserver)
            .tap(() => this.loadAsync());
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

        return this.rootSpan(isAdd ? 'create' : 'update').run(async ctx => {
            const fetchMethod = isAdd ? 'postJson' : 'putJson',
                response = await ctx[fetchMethod]({url, body: {data}}),
                responseData = dataRoot ? response[dataRoot] : response;

            this.updateData([responseData]);

            await this.ensureLookupsLoadedAsync(ctx);

            return this.getById(responseData.id);
        });
    }

    private async ensureLookupsLoadedAsync(ctx: CallContext) {
        if (this.lookupsLoaded && !this.reloadLookupsOnLoad) return;

        const lookupFields = this.fields.filter(it => !!it.lookupName);
        if (!lookupFields.length) {
            this.lookupsLoaded = true;
            return;
        }

        await this.runOn(ctx)
            .newSpan('loadLookups')
            .run(async ctx => {
                const lookupData = await ctx.fetchJson({url: `${this.url}/lookupData`});
                lookupFields.forEach(f => {
                    f.lookup = lookupData[f.lookupName];
                });
                this.lookupsLoaded = true;
            });
    }
}
