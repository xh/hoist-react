/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {HoistBase} from '@xh/hoist/core';
import {ValidationState} from '@xh/hoist/data';
import {computed, makeObservable} from '@xh/hoist/mobx';
import {find, map, some, sumBy} from 'lodash';
import {RecordFieldValidator} from './RecordFieldValidator';

/**
 * Computes validation state for a Record
 * @private
 */
export class RecordValidator extends HoistBase {

    /** @member {Record} */
    record;

    /** @member {RecordId} */
    get id() {
        return this.record.id;
    }

    /** @return {boolean} - true if the record is confirmed to be Valid. */
    @computed
    get isValid() {
        return this.validationState === ValidationState.Valid;
    }

    /** @return {boolean} - true if the record is confirmed to be NotValid. */
    @computed
    get isNotValid() {
        return this.validationState === ValidationState.NotValid;
    }

    /** @return {ValidationState} - the current validation state of the record. */
    @computed
    get validationState() {
        return this.getValidationState();
    }

    /** @return {RecordErrorMap} - map of field names -> field-level errors. */
    @computed.struct
    get errors() {
        return this.getErrorMap();
    }

    /** @return {number} - count of all validation errors for the record. */
    @computed
    get errorCount() {
        return sumBy(this._validators, 'errorCount');
    }

    /** @return {boolean} - true if any fields are currently recomputing their validation state. */
    @computed
    get isPending() {
        return some(this._validators, it => it.isPending);
    }

    _validators = [];

    /**
     * @param {Object} c - RecordValidator configuration.
     * @param {Record} c.record - Record to validate
     */
    constructor({record}) {
        super();
        makeObservable(this);
        this.record = record;

        const {fields} = this.record.store;
        this._validators = fields.map(field => new RecordFieldValidator({record, field}));
    }

    /**
     * Recompute validations for the record and return true if valid.
     * @returns {Promise<boolean>}
     */
    async validateAsync() {
        const promises = map(this._validators, v => v.validateAsync());
        await Promise.all(promises);
        return this.isValid;
    }

    /** @return {ValidationState} - the current validation state for the record. */
    getValidationState() {
        const VS = ValidationState,
            states = map(this._validators, v => v.validationState);
        if (states.includes(VS.NotValid)) return VS.NotValid;
        if (states.includes(VS.Unknown)) return VS.Unknown;
        return VS.Valid;
    }

    /** @return {RecordErrorMap} - map of field names -> field-level errors. */
    getErrorMap() {
        const ret = {};
        this._validators.forEach(v => ret[v.id] = v.errors);
        return ret;
    }

    /**
     * @param {string} id - ID of RecordFieldValidator (should match field.name)
     * @return {RecordFieldValidator}
     */
    findFieldValidator(id) {
        return find(this._validators, {id});
    }
}

/**
 * @typedef {Object.<string, string[]>} RecordErrorMap - map of Field names -> Field-level error lists.
 */
