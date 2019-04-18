/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {isString} from 'lodash';

import {Field} from './Field';

/**
 * A managed and observable set of Records.
 * @see LocalStore
 * @see UrlStore
 * @abstract
 */
export class BaseStore {

    /**
     * Fields contained in each record.
     * @member {Field[]}
     */
    fields = null;

    /**
     * Get a specific field, by name.
     * @param {string} name - field name to locate.
     * @return {Field}
     */
    getField(name) {
        return this.fields.find(it => it.name === name);
    }
    
    /**
     * Records in this store, respecting any filter (if applied).
     * @return {Record[]}
     */
    get records() {}

    /**
     * All records in this store, unfiltered.
     * @return {Record[]}
     */
    get allRecords() {}

    /**
     * Records in this store, respecting any filter, returned in a tree structure.
     * @return {RecordNode[]}
     */
    get recordsAsTree() {}

    /**
     * All records in this store, unfiltered, returned in a tree structure.
     * @return {RecordNode[]}
     */
    get allRecordsAsTree() {}

    /** Filter function to be applied. */
    get filter() {}
    setFilter(filterFn) {}

    /** Get the count of all records loaded into the store. */
    get allCount() {}

    /** Get the count of the filtered record in the store. */
    get count() {}

    /** Is the store empty after filters have been applied? */
    get empty() {return this.count === 0}

    /** Is this store empty before filters have been applied? */
    get allEmpty() {return this.allCount === 0}

    /**
     * Get a record by ID, or null if no matching record found.
     *
     * @param {(string|number)} id
     * @param {boolean} [filteredOnly] - true to skip records excluded by any active filter.
     * @return {Record}
     */
    getById(id, filteredOnly) {}

    /**
     * @param {Object} c - BaseStore configuration.
     * @param {(string[]|Object[]|Field[])} c.fields - names or config objects for Fields.
     */
    constructor({fields}) {
        this.fields = fields.map(f => {
            if (f instanceof Field) return f;
            if (isString(f)) f = {name: f};
            return new this.defaultFieldClass(f);
        });
    }

    /** Destroy this store, cleaning up any resources used. */
    destroy() {}

    //--------------------
    // For Implementations
    //--------------------
    get defaultFieldClass() {
        return Field;
    }
}

/**
 * @typedef {Object} RecordNode - node for a record and its children, representing a tree structure.
 * @property {Record} record
 * @property {RecordNode[]} children
 */

