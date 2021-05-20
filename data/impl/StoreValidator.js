/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {HoistBase, managed} from '@xh/hoist/core';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {cloneDeep, compact, flatten, isEmpty, map} from 'lodash';

import {ValidationState} from '../validation/ValidationState';

/**
 * Computes and stores validation state for a Store and its modified Records.
 *
 * @private
 */
export class StoreValidator extends HoistBase {

    /** @member {Store} */
    store;

    @managed _validationTask = new PendingTaskModel({mode: 'all'});

    // Stores the result of evaluating each record. Errors are store in a deep map structure
    // to facilitate access at the record, field and rule levels:
    // e.g. _errors[record.id][field.name][rule] = errors[]
    @observable.ref _errors = {};

    /** @return {boolean} */
    @computed
    get isValid() {
        return this.validationState === ValidationState.Valid;
    }

    /** @return {ValidationState} - the current validation state of the store. */
    @computed
    get validationState() {
        return this.getValidationState();
    }

    /** @return {boolean} - true if currently recomputing validation state. */
    get isPending() {
        return this._validationTask.isPending;
    }

    /** @return {string[]} */
    @computed
    get errors() {
        return this.getErrors();
    }

    /** @return {number} - count of all validation errors for the store. */
    @computed
    get errorCount() {
        return this.errors.length;
    }

    /**
     * @param {Store} store - Parent store to which this validator belongs
     */
    constructor(store) {
        super();
        makeObservable(this);
        this.store = store;
    }

    //---------------------------------------
    // Validating Store
    //---------------------------------------
    /**
     * Recompute validations for all records and return true if the store is valid.
     * @returns {Promise<boolean>}
     */
    async validateAsync() {
        if (!this.store.isModified) return true;
        const promises = map(this.store.modifiedRecords, record => this.validateRecordAsync(record));
        await Promise.all(promises);
        return this.isValid;
    }

    /** @return {ValidationState} - the current validation state of the store. */
    getValidationState() {
        const VS = ValidationState;
        if (!this.store.isModified) return VS.Valid;

        const states = map(this.store.modifiedRecords, record => record.validationState);
        return states.includes(VS.NotValid) ? VS.NotValid : VS.Valid;
    }

    /** @return {string[]} - list of all errors in the store */
    getErrors() {
        return flatten(map(this.store.modifiedRecords, record => this.getErrorsForRecord(record)));
    }

    //---------------------------------------
    // Validating Records
    //---------------------------------------
    /**
     * Recompute validations for a given record and return true if the record is valid.
     * @returns {Promise<boolean>}
     */
    async validateRecordAsync(record) {
        if (!record.isModified) return true;
        const promises = map(this.store.fields, field => this.validateRecordFieldAsync(record, field));
        await Promise.all(promises).linkTo(this._validationTask);
        return record.isValid;
    }

    /** @return {ValidationState} - the current validation state for a given record. */
    getRecordValidationState(record) {
        const VS = ValidationState;
        if (!record.isModified) return VS.Valid;

        const states = map(this.store.fields, field => this.getRecordFieldValidationState(record, field));
        return states.includes(VS.NotValid) ? VS.NotValid : VS.Valid;
    }

    /** @return {string[]} - list of all errors for a given record */
    getErrorsForRecord(record) {
        return flatten(map(this.store.fields, field => this.getErrorsForRecordField(record, field)));
    }

    //---------------------------------------
    // Validating Record Fields
    //---------------------------------------
    async validateRecordFieldAsync(record, field) {
        const promises = field.rules.map(async (rule, idx) => {
            const result = await this.evaluateRuleAsync(record, field, rule);
            this.updateErrors(record, field, idx, result);
        });
        await Promise.all(promises);
    }

    /** @return {ValidationState} - the current validation state for a field on a given record. */
    getRecordFieldValidationState(record, field) {
        const VS = ValidationState;
        if (!record.isModified) return VS.Valid;

        const errors = this.getErrorsForRecordField(record, field);
        return isEmpty(errors) ? VS.Valid : VS.NotValid;
    }

    /** @return {string[]} - list of all validation errors for the field on a given record. */
    getErrorsForRecordField(recOrId, fieldOrId) {
        const id = recOrId.isRecord ? recOrId.id : recOrId,
            field = fieldOrId.isField ? fieldOrId.name : fieldOrId;
        return flatten(this._errors[id]?.[field]);
    }

    //---------------------------------------
    // Implementation
    //---------------------------------------
    async evaluateRuleAsync(record, field, rule) {
        if (this.ruleIsActive(record, field, rule)) {
            const promises = rule.check.map(async (constraint) => {
                const {name, displayName} = field,
                    value = record.get(name),
                    fieldState = {value, displayName};

                return await constraint(fieldState, record.getValues());
            });

            const ret = await Promise.all(promises);
            return compact(flatten(ret));
        }
        return [];
    }

    ruleIsActive(record, field, rule) {
        const {when} = rule;
        return !when || when(field, record.getValues());
    }

    @action
    updateErrors(record, field, idx, result) {
        const {id} = record, {name} = field,
            errors = cloneDeep(this._errors);

        if (isEmpty(errors[id])) errors[id] = {};
        if (isEmpty(errors[id][name])) errors[id][name] = [];
        errors[id][name][idx] = result;
        this._errors = errors;
    }
}