/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import {isEqual, isFunction} from 'lodash';

import {Filter} from './Filter';

/**
 * Represents a filter operation using a function. Used by {@see FilterModel}.
 * Immutable.
 */
export class FunctionFilter extends Filter {

    get isFunctionFilter() {return true}

    /** @member {string} */
    id;
    /** @member {function} */
    testFn;

    /**
     * @param {Object} c - FunctionFilter configuration.
     * @param {string} c.id - ID for this Filter. Used to replace / deduplicate filters.
     * @param {function} c.testFn - Function to run. Will receive (Record|Object) as argument,
     *      and should return a boolean.
     */
    constructor({
        id,
        testFn
    }) {
        super();

        throwIf(!id, 'FunctionFilter requires an `id`');
        throwIf(!isFunction(testFn), 'FunctionFilter requires a `testFn`');

        this.id = id;
        this.testFn = testFn;

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
        return other.isFunctionFilter && isEqual(this.id, other.id);
    }
}
