/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {RecordSpec} from 'hoist/data';

/**
 * A managed observable set of Records.
 *
 * This class is intended to be abstract.  See LocalStore, RestStore, or UrlStore for
 * concrete implementations.
 */
export class BaseStore {

    /** Specification of metadata individual records. **/
    recordSpec = null;

    /** Current loading state. **/
    get loadModel() {}

    /** Current records. These represent the post-filtered records. **/
    get records() {}

    /** All records.  These are the pre-filtered records. **/
    get allRecords() {}

    /** Filter.  Filter function to be applied. **/
    get filter() {}
    set filter(filterFn) {}

    /**
     * Construct this object.
     *
     * @param recordSpec, recordSpec or valid configuration for 1
     */
    constructor({recordSpec}) {
        this.recordSpec = recordSpec instanceof RecordSpec ? recordSpec : new RecordSpec(recordSpec);
    }
}