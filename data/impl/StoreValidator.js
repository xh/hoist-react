/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {XH, HoistBase} from '@xh/hoist/core';
import {computed, makeObservable, observable} from '@xh/hoist/mobx';
import {find, sumBy, map, some} from 'lodash';

import {RecordValidator} from './RecordValidator';
import {ValidationState} from '../validation/ValidationState';

/**
 * Computes validation state for a Store's uncommitted Records
 * @private
 */
export class StoreValidator extends HoistBase {

    /** @member {Store} */
    store;

    /** @return {boolean} - true if the store is confirmed to be Valid. */
    @computed
    get isValid() {
        return this.validationState === ValidationState.Valid;
    }

    /** @return {boolean} - true if the store is confirmed to be NotValid. */
    @computed
    get isNotValid() {
        return this.validationState === ValidationState.NotValid;
    }

    /** @return {ValidationState} - the current validation state of the store. */
    @computed
    get validationState() {
        return this.getValidationState();
    }

    /** @return {StoreErrorMap} - Map of StoreRecord IDs to StoreRecord-level error maps. */
    @computed.struct
    get errors() {
        return this.getErrorMap();
    }

    /** @return {number} - count of all validation errors for the store. */
    @computed
    get errorCount() {
        return sumBy(this._validators, 'errorCount');
    }

    /** @return {boolean} - true if any records are currently recomputing their validation state. */
    @computed
    get isPending() {
        return some(this._validators, it => it.isPending);
    }

    /** @member {RecordValidator[]} */
    @observable.ref _validators = [];

    /**
     * @param {Object} c - StoreValidator configuration.
     * @param {Store} c.store - Store to validate
     */
    constructor({store}) {
        super();
        makeObservable(this);
        this.store = store;

        this.addReaction({
            track: () => this.uncommittedRecords,
            run: () => this.syncValidatorsAsync()
        });
    }

    /**
     * Recompute validations for the store and return true if valid.
     * @returns {Promise<boolean>}
     */
    async validateAsync() {
        const promises = map(this._validators, v => v.validateAsync());
        await Promise.all(promises);
        return this.isValid;
    }

    /** @return {ValidationState} - the current validation state for the store. */
    getValidationState() {
        const VS = ValidationState,
            states = map(this._validators, v => v.validationState);
        if (states.includes(VS.NotValid)) return VS.NotValid;
        if (states.includes(VS.Unknown)) return VS.Unknown;
        return VS.Valid;
    }

    /** @return {StoreErrorMap} - map of StoreRecord IDs -> StoreRecord-level error maps. */
    getErrorMap() {
        const ret = {};
        this._validators.forEach(v => ret[v.id] = v.errors);
        return ret;
    }

    /**
     * @param {StoreRecordId} id - ID of RecordValidator (should match record.id)
     * @return {RecordValidator}
     */
    findRecordValidator(id) {
        return find(this._validators, {id});
    }

    //---------------------------------------
    // Implementation
    //---------------------------------------
    get uncommittedRecords() {
        return this.store.allRecords.filter(it => !it.isCommitted);
    }

    async syncValidatorsAsync() {
        XH.safeDestroy(this._validators);
        this._validators = this.uncommittedRecords.map(record => new RecordValidator({record}));
        return this.validateAsync();
    }
}

/**
 * @typedef {Object.<StoreRecordId, RecordErrorMap>} StoreErrorMap - map of StoreRecord IDs -> StoreRecord-level error maps.
 */
