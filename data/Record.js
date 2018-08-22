/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {observable, action} from '@xh/hoist/mobx';
import {without} from 'lodash';
import {BaseStore} from './BaseStore';

/**
 * Core data for Store.
 *
 * This object is intended to be created and managed internally by Store implementations.  It should be
 * considered immutable.
 */
export class Record {

    /** @member {string} - unique id. */
    id
    /** @member {Object} - raw data for this record. */
    raw
    /** @member {Object} - collection of field/value pairs for this object. */
    data
    /** @member {Object} - parent record. */
    parent
    /** @member {Record[]} - Children of this record. */
    children


    /**
     * Will apply basic validation and conversion (e.g. 'date' will convert from UTC time to
     * a JS Date object). An exception will be thrown if the validation or conversion fails.
     */
    constructor({raw, fields, parent = null, children = []}) {
        this.id = raw.id;
        this.raw = raw;
        this.children = children;
        this.parent = parent;

        const data = {};
        fields.forEach(field => {
            const {type, name, defaultValue} = field;
            let val = raw[name];
            if (val === undefined || val === null) val = defaultValue;

            if (val !== null) {
                switch (type) {
                    case 'auto':
                    case 'string':
                    case 'int':
                    case 'number':
                    case 'bool':
                    case 'json':
                    case 'day':
                        break;
                    case 'date':
                        val = new Date(val);
                        break;
                    default:
                        throw XH.exception(`Unknown field type '${type}'`);
                }
            }
            data[name] = val;
        });

        this.data = data;
    }

    /**
     * Return a filtered version of this record.
     *
     * If the record fails the filter, null will be returned.
     * @return {Record}
     */
    applyFilter(filter) {
        const {children} = this;

        // apply to any children;
        let passingChildren =[];
        if (children) {
            children.each(child => {
                child = child.applyFilter(filter);
                if (child) passingChildren.push(child);
            }
        }

        // ... then potentially apply to self.
        if (passingChildren.length || filter(this)) {
            if (passingChildren.length == children.length) {
                return this;
            } else {
                const ret = this.clone();
                ret.children = passingChildren;
                return ret;
            }
        }

        return null;
    }

    /**
     * Return a version of this record with a child removed.
     * @return {Record}
     */
    removeChild(child) {
        const ret = this.clone();
        ret.children = without(this.children, child);
        return ret;
    }

    /**
     * Copy this record.
     */
    clone() {
        const ret = new Record();
        ret.id = this.id;
        ret.raw = this.raw;
        ret.data = this.data;
        ret.parent = this.parent;
        ret.children = this.children;
        return ret;
    }
}