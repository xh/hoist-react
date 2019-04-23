/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */


import {assign, isEmpty, merge, forEach} from 'lodash';
import {RecordAdd, RecordChange, FieldChange} from '/update';
import {Field} from './Field';
import {Record} from '@xh/hoist/data/cube/record/Record';

/**
 * An object for grouping and aggregating data on multiple dimensions.
 *
 * Note that this object does not handle record removal, or dimension changes for
 * existing records.
 *
 * This API in intended primarily for data specification and loading.
 * See View for the main API for accessing data from this object.
 */
class Cube {

    _fields = null;
    _recordMap = null;
    _connectedViews = null;
    _idProperty = null;
    _info = null;
    _lockFn = null;

    static RECORD_ID_DELIMITER = '>>';

    /**
     * Construct this object.
     *
     * @param {Object[]} data - array of raw data.
     * @param {Object} info - map of metadata associated with this data.
     * @param {Field[]} fields - array of Fields to be loaded in this cube.
     * @param {String} idProperty - property representing unique id of loaded records.
     * @param {boolean} lockFn - function to be applied to a node to determine if it should be "locked",
     *      preventing drilldown into its children (optional).  If true returned for a node,
     *      no drilldown will be allowed, and the row will be marked with a boolean "locked" property.
     */
    constructor({data, info, fields, lockFn, idProperty = 'id'}) {
        this._idProperty = idProperty;
        this._fields = this.processRawFields(fields);
        this._recordMap = this.processRawData(data);
        this._info = Object.freeze(info);
        this._lockFn = lockFn;
        this._connectedViews = new Set();
    }

    getFields() {
        return this._fields;
    }

    getRecords() {
        return this._recordMap;
    }

    getInfo() {
        return this._info;
    }

    //---------------------
    // Loading
    //---------------------
    loadData(rawData, info) {
        this._recordMap = this.processRawData(rawData);
        this._info = info;
        this._connectedViews.forEach(it => it.noteCubeLoaded);
    }

    loadUpdates(rawUpdates, info) {
        // 1) Process record changes locally
        const updates = this.processRawUpdates(rawUpdates);
        updates.forEach(it => {
            const rec = it.record;
            switch (it.type) {
                case 'CHANGE':
                    rec.processChange(it);
                    break;
                case 'ADD':
                    this._recordMap[rec.getId()] = rec;
                    break;
            }
        });

        // 2) Process info changes locally (merge with existing to allow for partial updates)
        const infoUpdated = !isEmpty(info);
        if (infoUpdated) {
            this._info = merge({}, this._info, info);
        }

        // 3) Notify connected views
        this._connectedViews.forEach(it => it.noteCubeUpdated(updates, infoUpdated));
    }

    //--------------------
    // View management
    //--------------------
    connect(view) {
        this._connectedViews.add(view);
    }

    disconnect(view) {
        this._connectedViews.delete(view);
    }

    isConnected(view) {
        this._connectedViews.has(view);
    }

    //---------------------
    // Implementation
    //---------------------
    processRawFields(raw) {
        const ret = {};
        raw.forEach(f => {
            const field = f instanceof Field ? f : new Field(f);
            ret[field.name] = field;
        });
        return ret;
    }


    createRecord(raw) {
        const id = raw[this._idProperty];
        raw.id = id;
        raw.cubeLabel = id;
        return new Record(this._fields, raw);
    }

    processRawData(rawData) {
        const ret = {};
        rawData.forEach(raw => {
            const rec = this.createRecord(raw);
            ret[rec.getId()] = rec;
        });
        return ret;
    }

    processRawUpdates(rawUpdates) {
        const newRecords = {},
            ret = [];

        // 0) Flatten interstitial changes to a single change by id.
        const rawMap = {};
        rawUpdates.forEach(raw => {
            const id = raw[this._idProperty],
                prevRaw = rawMap[id];
            rawMap[id] = prevRaw ? assign(prevRaw, raw) : raw;
        });


        // 2) Process and validate changes
        forEach(rawMap, (raw, id) => {

            // 1) Handle new record
            let rec = this._recordMap[id] || newRecords[id];
            if (!rec) {
                rec = this.createRecord(raw);
                newRecords[rec.getId()] = rec;
                ret.push(new RecordAdd(rec));
                return;
            }

            // 2) Handle and validate non-spurious changes
            const fieldChanges = [];
            for (const f in raw) {
                if (f === this._idProperty) continue;
                const field = this._fields[f],
                    currVal = rec.get(f),
                    rawVal = raw[f];

                if (!field || currVal === rawVal) {
                    continue;
                }

                if (field.isDimension) {
                    console.error('Streaming Dimension Change not currently handled by Cube. Change has been skipped');
                    continue;
                }

                fieldChanges.push(new FieldChange(field, currVal, rawVal));
            }
            if (fieldChanges.length) {
                ret.push(new RecordChange(rec, fieldChanges));
            }
        });

        return ret;
    }
}