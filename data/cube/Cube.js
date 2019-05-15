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
     * @param {(Field[]|Object[])} c.fields - array of Fields / {@see Field} configs.
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
        this._records = this.processRawData(data || []);
        this._info = Object.freeze(info || {});
        this._lockFn = lockFn;
    }

    /** @returns {Map} - map of Fields supported by this Cube, by Field name. */
    get fields() {
        return this._fields;
    }

    /** @returns {Field[]} */
    get fieldList() {
        return Array.from(this.fields.values());
    }

    /** @returns {string[]} */
    get fieldNames() {
        return Array.from(this.fields.keys());
    }

    /** @returns {CubeRecord[]} - CubeRecords loaded into this Cube */
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
    async loadDataAsync(rawData, info = {}) {
        this._records = this.processRawData(rawData);
        this._info = info;
    }

    /**
     * Return grouped and filtered data.
     *
     * @param {Object} query - config for a {@see Query}.
     * @returns {Promise<Object>} - hierarchical representation of filtered and aggregated data, suitable
     *      for passing directly to a Hoist Store.
     */
    async executeQueryAsync(query) {
        query = new Query({...query, cube: this});
        const ret = QueryExecutor.getDataAsync(query);
        console.log(ret);
        return ret;
    }


    //---------------------
    // Implementation
    //---------------------
    processRawFields(raw) {
        const ret = new Map();
        raw.forEach(f => {
            const field = f instanceof Field ? f : new Field(f);
            ret.set(field.name, field);
        });
        return ret;
    }

    processRawData(rawData) {
        return rawData.map(raw => this.createRecord(raw));
    }

    createRecord(raw) {
        const {_idSpec} = this;
        const id = isString(_idSpec) ? raw[_idSpec] : _idSpec(raw);
        return new CubeRecord(this._fields, raw, id);
    }
}