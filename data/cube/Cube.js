/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */


import {Field} from './Field';
import {CubeRecord} from './record';
import {Query} from './Query';
import {QueryExecutor} from './impl/QueryExecutor';
import {isString} from 'lodash';

/**
 * An object for grouping and aggregating data on multiple dimensions.
 *
 * Note that this object does not handle record removal, or dimension changes for
 * existing records.
 */
export class Cube {

    _fields = null;
    _recordMap = null;
    _idSpec = null;
    _info = null;
    _lockFn = null;

    static RECORD_ID_DELIMITER = '>>';

    /**
     * @param {Object} c - Cube configuration.
     * @param {Field[]} c.fields - array of Fields to be loaded in this cube.
     * @param {Object[]} [c.data] - array of raw data.
     * @param {Object} [c.info] - map of metadata associated with this data.
     * @param {(String|function)} [c.idSpec] - property representing unique id of loaded records.
     * @param {function} [c.lockFn] - function to be called for each node to determine if it should
     *      be "locked", preventing drilldown into its children. If true returned for a node, no
     *      drilldown will be allowed, and the row will be marked with a boolean "locked" property.
     */
    constructor({fields, lockFn, idSpec = 'id', data, info}) {
        this._idSpec = idSpec;
        this._fields = this.processRawFields(fields);
        this._recordMap = this.processRawData(data || []);
        this._info = Object.freeze(info || {});
        this._lockFn = lockFn;
    }

    get fields() {
        return this._fields;
    }

    get records() {
        return this._recordMap;
    }

    get info() {
        return this._info;
    }

    //---------------------
    // Loading
    //---------------------
    loadData(rawData, info) {
        this._recordMap = this.processRawData(rawData);
        this._info = info;
    }

    //---------------------------
    // Querying
    //---------------------------
    /**
     * Return grouped and filtered data.
     *
     * @param {Object} query - config for Query.
     * @returns {Object} - hierarchichal representation of data.
     *     suitable for passing directly to a Hoist Store.
     */
    executeQuery(query) {
        query = new Query({...query, cube: this});
        return QueryExecutor.getData(query);
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
        const {_idSpec} = this;
        const id = isString(_idSpec) ? raw[_idSpec] : _idSpec(raw);
        return new CubeRecord(this._fields, raw, id);
    }

    processRawData(rawData) {
        const ret = new Map();
        rawData.forEach(raw => {
            const rec = this.createRecord(raw);
            ret.set(rec.id, rec);
        });
        return ret;
    }
}