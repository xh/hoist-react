/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import {isFunction} from 'lodash';

import {Filter} from './Filter';

/**
 * Represents a filter operation using a function. Used by {@see FilterModel}.
 * Immutable.
 */
export class FunctionFilter extends Filter {

    get isFunctionFilter() {return true}

    /** @member {function} */
    testFn;

    /**
     * Create a new FunctionFilter.
     *
     * @param {(Object|function)} cfg - FunctionFilter configuration or raw function.
     */
    static create(cfg) {
        if (isFunction(cfg)) {
            cfg = {testFn: cfg};
        }
        return new FunctionFilter(cfg);
    }

    /**
     * @param {Object} c - Config object.
     * @param {function} [c.testFn] - function receiving (Record|Object) as argument and returning a boolean.
     * @param {string} [c.group] - Optional group associated with this filter.
     */
    constructor({testFn, group = null}) {
        super();
        throwIf(!isFunction(testFn), 'FunctionFilter requires a `testFn`');
        this.testFn = testFn;
        this.group = group;

        Object.freeze(this);
    }

    serialize() {
        throw XH.exception('FunctionFilter can not be serialized using serialize().');
    }

    /**
     * @param {(Record|Object)} v - Record or Object to evaluate
     * @returns {boolean} - true if the provided Record/Object passes this filter's testFn.
     */
    test(v) {
        return this.testFn(v);
    }

    /**
     * @param {FunctionFilter} other
     * @returns {boolean} - true if the other filter is equivalent with this instance.
     */
    equals(other) {
        return other.isFunctionFilter && this.testFn === other.testFn && other.group === this.group;
    }
}
