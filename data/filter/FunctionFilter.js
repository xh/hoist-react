/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';
import {isEqual, isFunction} from 'lodash';

import {Filter} from './Filter';

/**
 * Represents a filter operation using a function. Typically used by @see FilterModel to
 * produce a filtered set of Records.
 *
 * Immutable.
 */
export class FunctionFilter extends Filter {

    get isFunctionFilter() {return true}

    id;
    testFn;

    /**
     * @param {Object} c - FunctionFilter configuration.
     * @param {string} c.id - Id for this Filter. Used to replace / deduplicate filters.
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
        throw new Error('FunctionFilter can not be serialized using serialize().');
    }

    /**
     * Evaluates a Record or Object using the function.
     * @param {(Record|Object)} v - Record or Object to evaluate
     * @returns {boolean}
     */
    test(v) {
        return this.testFn(v);
    }

    /**
     * Should two FunctionFilters be considered equal?
     * @returns {boolean}
     */
    equals(other) {
        return (
            isEqual(this.isFunctionFilter, other.isFunctionFilter) &&
            isEqual(this.id, other.id)
        );
    }
}
