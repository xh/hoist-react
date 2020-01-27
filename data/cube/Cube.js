/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */


import {CubeField} from './CubeField';
import {CubeRecord} from './record';
import {Query} from './Query';
import {QueryExecutor, Update} from './impl';
import {forEach, isEmpty} from 'lodash';


/**
 * A container for grouping, aggregating, and filtering data on multiple dimensions.
 */
export class Cube {

    _fields = null;
    _records = null;
    _idSpec = null;
    _info = null;
    _lockFn = null;

    static RECORD_ID_DELIMITER = '>>';

    /**
     * @param {Object} c - Cube configuration.
     * @param {(CubeField[]|Object[])} c.fields - array of CubeFields / {@see CubeField} configs.
     * @param {Object[]} [c.data] - array of raw data.
     * @param {Object} [c.info] - map of metadata associated with this data.
     * @param {(String)} [c.idSpec] - property representing unique id of loaded records.
     * @param {function} [c.lockFn] - function to be called for each node to determine if it should
     *      be "locked", preventing drilldown into its children. If true returned for a node, no
     *      drilldown will be allowed, and the row will be marked with a boolean "locked" property.
     */
    constructor({fields, lockFn, idSpec = 'id', data, info}) {
        this._idSpec = idSpec;
        this._fields = this.processRawFields(fields);
        this._records = this.processRawData(data);
        this._info = Object.freeze(info || {});
        this._lockFn = lockFn;
    }

    /** @returns {Map} - map of CubeFields supported by this Cube, by CubeField name. */
    get fields() {
        return this._fields;
    }

    /** @returns {CubeField[]} */
    get fieldList() {
        return Array.from(this.fields.values());
    }

    /** @returns {string[]} */
    get fieldNames() {
        return Array.from(this.fields.keys());
    }

    /** @returns {Map<string, Record>} - CubeRecords loaded into this Cube */
    get records() {
        return this._records;
    }

    /** @returns {Object} - optional metadata associated with this Cube at the last data load. */
    get info() {
        return this._info;
    }

    /**
     * Populate this cube with a new dataset.
     * @param {Object[]} rawData - flat array of lowest/leaf level data rows.
     * @param {Object} info - optional metadata to associate with this cube/dataset.
     */
    loadData(rawData, info = {}) {
        this._records = this.processRawData(rawData);
        this._info = info;
    }

    /**
     * Uupdate this cube with incremental data set changes and/or info.
     *
     * @param {Object[]} rawUpdates - partial updates to data
     * @param {Object} info
     */
    updateData(rawUpdates, info) {
        const updates = this.processRawUpdates(rawUpdates);

        // 1) Process record changes locally
        if (updates) {
            const newRecords = new Map(this.records);
            updates.forEach(({record}) => {
                newRecords.set(record.id, record);
            });
        }
        this._records = newRecords;

        // 2) Process info
        const infoUpdated = isEmpty(info);
        if (!isEmpty(info)) {
            this._info = {...this._info, info};
        }

        // 3) Notify connected views
        this._connectedViews.forEach(it => {
            it.noteCubeUpdated(updates, infoUpdated);
        });
    }

    //---------------------
    // Implementation
    //---------------------
    processRawFields(raw) {
        const ret = new Map();
        raw?.forEach(f => {
            const field = f instanceof CubeField ? f : new CubeField(f);
            ret.set(field.name, field);
        });
        return ret;
    }

    processRawData(raw) {
        const ret = new Map();
        raw?.forEach(r => {
            const rec = this.createRecord(r);
            ret.set(rec.id, rec);
        });
        return ret;
    }

    createRecord(raw) {
        const id = raw[this._idSpec];
        return new CubeRecord(this._fields, raw, id);
    }

    processRawUpdates(rawUpdates) {
        const fields = this.fields,
            oldRecords = this.records,
            newRecords = new Map(),
            ret = [];

        // 0) Flatten interstitial changes to a single change by id.
        const rawMap = new Map();
        rawUpdates.forEach(raw => {
            const id = raw[this._idSpec];
            rawMap.set(id, {...rawMap.get(id), ...raw});
        });

        // 2) Process and validate changes
        forEach(rawMap, (raw, id) => {

            const oldRecord = oldRecords.get(id) ?? newRecords.get(id);
            if (!oldRecord) {
                // 1) New record
                const record = this.createRecord(raw);
                newRecords.set(rec.id, rec);
                ret.push(new Update({record}));
            } else {
                // 2) Updated Record -- validate non-spurious changes, field-wise
                const fieldChanges = [],
                    updatedRaw = {...oldRecord.data};
                for (const f in raw) {
                    if (f === this._idSpec) continue;
                    const field = fields[f];

                    if (!field) continue;
                    if (field.isDimension) {
                        console.error('Streaming Dimension Change not currently handled by Cube. Change has been skipped');
                        continue;
                    }

                    const oldValue = rec.get(f),
                        newValue = raw[f];

                    if (oldValue !== newValue) {
                        fieldChanges.push(field);
                        updatedRaw[field] = newValue;
                    }
                }

                if (fieldChanges.length) {
                    const record = this.createRecord(updatedRaw)
                    ret.push(new Update({record, oldRecord, fieldChanges}));
                }
            }
        });

        return ret;
    }
}