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
import {logDebug} from '../../utils/js';
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
        return some(this.validators, it => it.isPending);
    }

    get validators() {
        if (!this._validators) return [];
        return Array.from(this._validators.values());
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
        logDebug('validateAsync()', this);
        const promises = map(this.validators, v => v.validateAsync());
        await Promise.all(promises);
        return this.isValid;
    }

    /** @return {ValidationState} - the current validation state for the store. */
    getValidationState() {
        const VS = ValidationState,
            states = map(this.validators, v => v.validationState);
        if (states.includes(VS.NotValid)) return VS.NotValid;
        if (states.includes(VS.Unknown)) return VS.Unknown;
        return VS.Valid;
    }

    /** @return {StoreErrorMap} - map of StoreRecord IDs -> StoreRecord-level error maps. */
    getErrorMap() {
        const ret = {};
        this.validators.forEach(v => ret[v.id] = v.errors);
        return ret;
    }

    /**
     * @param {StoreRecordId} id - ID of RecordValidator (should match record.id)
     * @return {RecordValidator}
     */
    findRecordValidator(id) {
        return this._validators?.get(id);
    }

    async validateRecordsAsync(records) {
        const promises = records.map(rec => this._validators.get(rec.id).validateAsync());
        return Promise.all(promises);
    }

    //---------------------------------------
    // Implementation
    //---------------------------------------
    get uncommittedRecords() {
        console.debug('Building Uncommitted Records List');
        return this.store.allRecords.filter(it => !it.isCommitted);
    }

    async syncValidatorsAsync() {
        console.debug('Syncing Validators');

        const curValidators = this._validators;
        runInAction(() => this._validators = null);

        const updatedValidators = new Map(),
            promises = [];

        this.uncommittedRecords.forEach(record => {
            // Re-use existing validators so we keep the last validation results for the record and
            // avoid any unnecessary gc churn

            let recordValidator = curValidators.get(record.id),
                needsValidation = false;

            if (recordValidator) {
                if (record !== recordValidator.record) {
                    recordValidator.record = record;
                    needsValidation = true;
                }
            } else {
                recordValidator = new RecordValidator({record});
                needsValidation = true;
            }

            if (needsValidation) {
                promises.push(recordValidator.validateAsync());
            }

            updatedValidators.set(record.id, recordValidator);
        });

        runInAction(() => this._validators = updatedValidators);

        if (!isEmpty(promises)) {
            logDebug(`Validating ${promises.length} records`, this);
            await Promise.all(promises);
        }
    }
}

/**
 * @typedef {Object.<StoreRecordId, RecordErrorMap>} StoreErrorMap - map of StoreRecord IDs -> StoreRecord-level error maps.
 */
