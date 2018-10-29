/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
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
     * @member {HoistField[]}
     */
    fields = null;

    /**
     * Get a specific field, by name.
     * @param {string} name - field name to locate.
     * @return {HoistField}
     */
    getField(name) {
        return this.fields.find(it => it.name === name);
    }

    /** Current loading state. */
    get loadModel() {}

    /** Current records. These represent the post-filtered records. */
    get records() {}

    /** All records.  These are the pre-filtered records. */
    get allRecords() {}

    /** Filter.  Filter function to be applied. */
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

    /** Do any post-filtered records have children? */
    get tree() {}

    /** Do any pre-filtered records have children? */
    get allTree() {}

    /**
     * Get a record by ID. Return null if no record found.
     *
     * @param {number} id
     * @param {boolean} filteredOnly - true to skip non-filtered records.
     */
    getById(id, filteredOnly) {}

    /**
     * @param {Object} c - BaseStore configuration.
     * @param {(string[]|Object[]|HoistField[])} c.fields - names or config objects for Fields.
     */
    constructor({fields}) {
        this.fields = fields.map(f => {
            if (f instanceof Field) return f;
            if (isString(f)) f = {name: f};
            return new this.defaultFieldClass(f);
        });
    }

    //--------------------
    // For Implementations
    //--------------------
    get defaultFieldClass() {
        return Field;
    }
}
