/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

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
     * Construct this object
     *
     * Not typically called directly by applications.  Create from config using parseFilter()
     * instead.
     *
     * @param {Object} c - Config object.
     * @param {function} c.testFn - function receiving (Record|Object) as argument and
     *      returning a boolean.
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
    getTestFn(store) {
        return this.testFn;
    }

    equals(other) {
        return other?.isFunctionFilter && this.testFn === other.testFn;
    }
}
