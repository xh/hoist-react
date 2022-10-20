/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {HoistBase} from '@xh/hoist/core';
import {StoreRecord, StoreRecordId, ValidationState} from '@xh/hoist/data';
import {computed, makeObservable} from '@xh/hoist/mobx';
import {find, map, some, sumBy} from 'lodash';
import {RecordFieldValidator} from './RecordFieldValidator';

/**
 * Computes validation state for a StoreRecord.
 * @internal
 */
export class RecordValidator extends HoistBase {

    record: StoreRecord;

    get id(): StoreRecordId {
        return this.record.id;
    }

    /** True if the record is confirmed to be Valid. */
    @computed
    get isValid(): boolean {
        return this.validationState === ValidationState.Valid;
    }

    /** True if the record is confirmed to be NotValid. */
    @computed
    get isNotValid(): boolean {
        return this.validationState === ValidationState.NotValid;
    }

    /** The current validation state of the record. */
    @computed
    get validationState(): ValidationState {
        return this.getValidationState();
    }

    /** Map of field names to field-level errors. */
    @computed.struct
    get errors(): RecordErrorMap {
        return this.getErrorMap();
    }

    /** Count of all validation errors for the record. */
    @computed
    get errorCount(): number {
        return sumBy(this._validators, 'errorCount');
    }

    /** True if any fields are currently recomputing their validation state. */
    @computed
    get isPending(): boolean {
        return some(this._validators, it => it.isPending);
    }

    private _validators = [];

    constructor(config: {record: StoreRecord}) {
        super();
        makeObservable(this);
        const {record} = config;
        this.record = record;

        const {fields} = this.record.store;
        this._validators = fields.map(field => new RecordFieldValidator({record, field}));
    }

    /**
     * Recompute validations for the record and return true if valid.
     */
    async validateAsync(): Promise<boolean> {
        const promises = map(this._validators, v => v.validateAsync());
        await Promise.all(promises);
        return this.isValid;
    }

    /** The current validation state for the record. */
    getValidationState(): ValidationState {
        const VS = ValidationState,
            states = map(this._validators, v => v.validationState);
        if (states.includes(VS.NotValid)) return VS.NotValid;
        if (states.includes(VS.Unknown)) return VS.Unknown;
        return VS.Valid;
    }

    /** Map of field names to field-level errors. */
    getErrorMap(): RecordErrorMap {
        const ret = {};
        this._validators.forEach(v => ret[v.id] = v.errors);
        return ret;
    }

    /**
     * @param id - ID of RecordFieldValidator (should match field.name)
     */
    findFieldValidator(id: string): RecordFieldValidator {
        return find(this._validators, {id});
    }
}

/** Map of Field names to Field-level error lists. */
export type RecordErrorMap = Record<string, string[]>;

