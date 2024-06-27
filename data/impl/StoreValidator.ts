/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {HoistBase} from '@xh/hoist/core';
import {computed, makeObservable, runInAction, observable} from '@xh/hoist/mobx';
import {sumBy, chunk} from 'lodash';
import {findIn} from '@xh/hoist/utils/js';
import {RecordErrorMap, RecordValidator} from './RecordValidator';
import {ValidationState} from '../validation/ValidationState';
import {Store} from '../Store';
import {StoreRecordId} from '../StoreRecord';

/**
 * Computes validation state for a Store's uncommitted Records.
 * @internal
 */
export class StoreValidator extends HoistBase {
    store: Store;

    /** True if the store is confirmed to be Valid. */
    @computed
    get isValid(): boolean {
        return this.validationState === 'Valid';
    }

    /** True if the store is confirmed to be NotValid. */
    @computed
    get isNotValid(): boolean {
        return this.validationState === 'NotValid';
    }

    /** The current validation state of the store. */
    @computed
    get validationState(): ValidationState {
        return this.getValidationState();
    }

    /** Map of StoreRecord IDs to StoreRecord-level error maps. */
    @computed.struct
    get errors(): StoreErrorMap {
        return this.getErrorMap();
    }

    /** Count of all validation errors for the store. */
    @computed
    get errorCount(): number {
        return sumBy(this.validators, 'errorCount');
    }

    /** True if any records are currently recomputing their validation state. */
    @computed
    get isPending() {
        return !!findIn(this._validators, it => it.isPending);
    }

    get validators() {
        return this.mapValidators();
    }

    @observable.ref _validators = new Map<StoreRecordId, RecordValidator>();

    constructor(config: {store: Store}) {
        super();
        makeObservable(this);
        this.store = config.store;

        this.addReaction({
            track: () => this.uncommittedRecords,
            run: () => this.syncValidatorsAsync(),
            fireImmediately: true
        });
    }

    /**
     * Recompute validations for the store and return true if valid.
     */
    async validateAsync(): Promise<boolean> {
        await this.validateInChunksAsync(this.validators);
        return this.isValid;
    }

    /** @returns The current validation state for the store. */
    getValidationState(): ValidationState {
        const states = this.mapValidators(v => v.validationState);
        if (states.includes('NotValid')) return 'NotValid';
        if (states.includes('Unknown')) return 'Unknown';
        return 'Valid';
    }

    /** @returns map of StoreRecord IDs to StoreRecord-level error maps. */
    getErrorMap(): StoreErrorMap {
        const ret = {};
        this._validators.forEach(v => (ret[v.id] = v.errors));
        return ret;
    }

    /**
     * @param id - ID of RecordValidator (should match record.id)
     */
    findRecordValidator(id: StoreRecordId): RecordValidator {
        return this._validators.get(id);
    }

    //---------------------------------------
    // Implementation
    //---------------------------------------
    private get uncommittedRecords() {
        return this.store.allRecords.filter(it => !it.isCommitted);
    }

    private async syncValidatorsAsync() {
        const isComplex = this.store.validationIsComplex,
            currValidators = this._validators,
            newValidators = new Map(),
            toValidate = [];

        this.uncommittedRecords.forEach(record => {
            const {id} = record;

            // Re-use existing validators to preserve validation state and avoid churn.
            let validator = currValidators.get(id);

            // 1) If exists validator for an unchanged record, no need to validate
            if (!isComplex && validator?.record == record) {
                newValidators.set(id, validator);
                return;
            }

            // 2) Otherwise create/update the validator, and trigger validation
            if (!validator) {
                validator = new RecordValidator({record});
            } else {
                validator.record = record;
            }
            newValidators.set(id, validator);
            toValidate.push(validator);
        });

        await this.validateInChunksAsync(toValidate);
        runInAction(() => (this._validators = newValidators));
    }

    private async validateInChunksAsync(validators: RecordValidator[]) {
        const validateChunks = chunk(validators, 100);
        for (let chunk of validateChunks) {
            await Promise.all(chunk.map(v => v.validateAsync()));
        }
    }

    private mapValidators<T = RecordValidator>(fn: (v: RecordValidator) => T = undefined): T[] {
        return Array.from(this._validators.values(), fn);
    }
}

/** Map of StoreRecord IDs to StoreRecord-level error maps. */
export type StoreErrorMap = Record<StoreRecordId, RecordErrorMap>;
