/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from 'hoist/core';

import {UrlStore} from 'hoist/data';
import {action} from 'hoist/mobx';

/**
 * Store with additional support for RestGrid.
 */
export class RestStore extends UrlStore {

    _lookupsLoaded = false;

    /**
     * Construct this object.
     */
    constructor({dataRoot = 'data', ...rest}) {
        super({dataRoot, ...rest});
    }

    async loadAsync() {
        if (!this._lookupsLoaded) {
            const lookupFields = this.recordSpec.fields.filter(it => !!it.lookup);
            if (lookupFields.length) {
                const lookupData = await XH.fetchJson({url: `${this.url}/lookupData`});
                lookupFields.forEach(f => {
                    f.lookupValues = lookupData[f.lookup];
                });
                this._lookupsLoaded = true;
            }
        }
        return super.loadAsync();
    }

    async deleteRecordAsync(rec) {
        const {url} = this;

        return XH.fetchJson({
            url: `${url}/${rec.id}`,
            method: 'DELETE'
        }).then(() => {
            this.noteRecordDeleted(rec);
        }).linkTo(
            this.loadModel
        );
    }

    async addRecordAsync(rec) {
        return this.saveRecordInternalAsync(rec, true)
    }

    async saveRecordAsync(rec) {
        return this.saveRecordInternalAsync(rec, false)
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    saveRecordInternalAsync(rec, isAdd) {
        let {url} = this;
        if (!isAdd) url += '/' + rec.id;
        return XH.fetchJson({
            url,
            method: isAdd ? 'POST' : 'PUT',
            contentType: 'application/json',
            body: JSON.stringify({data: rec})
        }).then(response => {
            const recs = this.createRecords([response.data])
            this.noteRecordUpdated(recs[0]);
        }).linkTo(
            this.loadModel
        );
    }

    @action
    noteRecordUpdated(rec) {
        this.updateInCollection(rec, this._allRecords);
        const {filter} = this;
        if (!filter || filter(rec)) {
            this.updateInCollection(rec, this._records);
        } else {
            this.deleteFromCollection(rec, this._records)
        }
    }

    @action
    noteRecordDeleted(rec) {
       this.deleteFromCollection(rec, this._allRecords);
       this.deleteFromCollection(rec, this._records);
    }

    updateInCollection(rec, col) {
        const  idx = col.findIndex(r => r.id === rec.id);
        if (idx < 0) {
            col.push(rec);
        } else {
            col[idx] = rec;
        }
    }

    deleteFromCollection(rec, col) {
        remove(col, (r) => r.id === rec.id);
    }
}