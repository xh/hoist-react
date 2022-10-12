/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {XH, HoistBase} from '@xh/hoist/core';
import {computed, makeObservable, observable} from '@xh/hoist/mobx';
import {find, sumBy, map, some} from 'lodash';

import {RecordErrorMap, RecordValidator} from './RecordValidator';
import {ValidationState} from '../validation/ValidationState';
import {Store} from '../Store';
import {StoreRecordId} from '../StoreRecord';

/**
 * Computes validation state for a Store's uncommitted Records
 * @private
 */
export class StoreValidator extends HoistBase {

    store: Store;

    /** True if the store is confirmed to be Valid. */
    @computed
    get isValid(): boolean {
        return this.validationState === ValidationState.Valid;
    }

    /** True if the store is confirmed to be NotValid. */
    @computed
    get isNotValid(): boolean {
        return this.validationState === ValidationState.NotValid;
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
        return sumBy(this._validators, 'errorCount');
    }

    /** True if any records are currently recomputing their validation state. */
    @computed
    get isPending(): boolean {
        return some(this._validators, it => it.isPending);
    }

    @observable.ref
    private _validators: RecordValidator[] = [];

    /**
     * @param config.store - Store to validate
     */
    constructor(config: {store: Store}) {
        super();
        makeObservable(this);
        this.store = config.store;

        this.addReaction({
            track: () => this.uncommittedRecords,
            run: () => this.syncValidatorsAsync()
        });
    }

    /**
     * Recompute validations for the store and return true if valid.
     */
    async validateAsync(): Promise<boolean> {
        const promises = map(this._validators, v => v.validateAsync());
        await Promise.all(promises);
        return this.isValid;
    }

    /** @return The current validation state for the store. */
    getValidationState(): ValidationState {
        const VS = ValidationState,
            states = map(this._validators, v => v.validationState);
        if (states.includes(VS.NotValid)) return VS.NotValid;
        if (states.includes(VS.Unknown)) return VS.Unknown;
        return VS.Valid;
    }

    /** @return map of StoreRecord IDs -> StoreRecord-level error maps. */
    getErrorMap(): StoreErrorMap {
        const ret = {};
        this._validators.forEach(v => ret[v.id] = v.errors);
        return ret;
    }

    /**
     * @param id - ID of RecordValidator (should match record.id)
     */
    findRecordValidator(id: StoreRecordId): RecordValidator {
        return find(this._validators, {id});
    }

    //---------------------------------------
    // Implementation
    //---------------------------------------
    private get uncommittedRecords() {
        return this.store.allRecords.filter(it => !it.isCommitted);
    }

    private async syncValidatorsAsync(): Promise<boolean> {
        XH.safeDestroy(this._validators);
        this._validators = this.uncommittedRecords.map(record => new RecordValidator({record}));
        return this.validateAsync();
    }
}

/** Map of StoreRecord IDs -> StoreRecord-level error maps. */
export type StoreErrorMap = Record<StoreRecordId, RecordErrorMap>

