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
 * Represents a filter operation using a function.
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
     */
    constructor({testFn}) {
        super();
        throwIf(!isFunction(testFn), 'FunctionFilter requires a `testFn`');
        this.testFn = testFn;
        Object.freeze(this);
    }


    //-----------------
    // Overrides
    //-----------------
    serialize() {
        throw XH.exception('FunctionFilter can not be serialized using serialize().');
    }

    getTestFn(store) {
        return this.testFn;
    }

    equals(other) {
        return other.isFunctionFilter && this.testFn === other.testFn;
    }
}
