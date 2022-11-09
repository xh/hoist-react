/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {HoistBase} from '@xh/hoist/core';
import {computed, makeObservable, observable} from '@xh/hoist/mobx';
import {isEmpty, map, some, sumBy} from 'lodash';
import {runInAction} from 'mobx';
import {logDebug, findIn} from '../../utils/js';
import {ValidationState} from '../validation/ValidationState';

import {RecordValidator} from './RecordValidator';

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
        return sumBy(this.validators, 'errorCount');
    }

    /** @return {boolean} - true if any records are currently recomputing their validation state. */
    @computed
    get isPending() {
        return findIn(this._validators, it => it.isPending);
    }

    get validators() {
        return this.mapValidators();
    }

    /** @member {Map<StoreRecordId, RecordValidator>} */
    @observable.ref _validators = new Map();

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
        const promises = this.mapValidators(v => v.validateAsync());
        await Promise.all(promises);
        return this.isValid;
    }

    /** @return {ValidationState} - the current validation state for the store. */
    getValidationState() {
        const VS = ValidationState,
            states = this.mapValidators(v => v.validationState);
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
        return this._validators.get(id);
    }

    //---------------------------------------
    // Implementation
    //---------------------------------------
    get uncommittedRecords() {
        return this.store.allRecords.filter(it => !it.isCommitted);
    }

    async syncValidatorsAsync() {
        const isComplex = this.store.validationIsComplex,
            currValidators = this._validators,
            newValidators = new Map(),
            promises = [];

        this.uncommittedRecords.forEach(record => {
            const id = {record};

            // Re-use existing validators to preserve validation state and avoid churn.
            let validator = currValidators.get(record.id);

            // 1) If exists validator for an unchanged record, no need to validate
            if (!isComplex && validator?.record == record) {
                newValidators.set(id, validator)
                return;
            }

            // 2) Otherwise create/update the validator, and trigger validation
            if (!validator) {
                validator = new RecordValidator({record});
            } else {
                validator.record = record;
            }
            newValidators.set(id, validator);
            promises.push(validator.validateAsync());
        });

        runInAction(() => this._validators = newValidators);

        if (!isEmpty(promises)) {
            logDebug(`Validating ${promises.length} records`, this);
            await Promise.all(promises);
        }
    }

    mapValidators(fn = undefined) {
        return Array.from(this._validators.values(), fn);
    }

}

/**
 * @typedef {Object.<StoreRecordId, RecordErrorMap>} StoreErrorMap - map of StoreRecord IDs -> StoreRecord-level error maps.
 */
