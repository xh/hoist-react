/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */


import {Field} from './Field';
import {Record} from './record';

/**
 * An object for grouping and aggregating data on multiple dimensions.
 *
 * Note that this object does not handle record removal, or dimension changes for
 * existing records.
 *
 * This API in intended primarily for data specification and loading.
 * See View for the main API for accessing data from this object.
 */
export class Cube {

    _fields = null;
    _recordMap = null;
    _connectedViews = null;
    _idSpec = null;
    _info = null;
    _lockFn = null;

    static RECORD_ID_DELIMITER = '>>';

    /**
     * Construct this object.
     *
     * @param {Field[]} fields - array of Fields to be loaded in this cube.
     * @param {Object[]} [data] - array of raw data.
     * @param {Object} [info] - map of metadata associated with this data.
     * @param {(String|function)} [idSpec] - property representing unique id of loaded records.
     * @param {boolean} [lockFn] - function to be applied to a node to determine if it should be "locked",
     *      preventing drilldown into its children (optional).  If true returned for a node,
     *      no drilldown will be allowed, and the row will be marked with a boolean "locked" property.
     */
    constructor({fields, lockFn, idSpec = 'id', data, info}) {
        this._idSpec = idSpec;
        this._fields = this.processRawFields(fields);
        this._recordMap = this.processRawData(data || []);
        this._info = Object.freeze(info || {});
        this._lockFn = lockFn;
        this._connectedViews = new Set();
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
        this._connectedViews.forEach(it => it.noteCubeLoaded());
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
        const {_idSpec} = this;
        const id = _idSpec instanceof String ? raw[_idSpec] : _idSpec(raw);
        return new Record(this._fields, raw, id);
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