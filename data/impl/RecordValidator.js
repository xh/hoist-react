/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {ValidationState} from '@xh/hoist/data';
import {computed} from '@xh/hoist/mobx';
import {compact, flatten, isEmpty, mapValues, values} from 'lodash';
import {makeObservable, observable, runInAction} from 'mobx';
import {TaskObserver} from '../../core';

/**
 * Computes validation state for a StoreRecord
 * @private
 */
export class RecordValidator {

    /** @member {StoreRecord} */
    record;

    @observable.ref _fieldErrors = null;
    _validationTask = TaskObserver.trackLast();
    _validationRunId = 0;

    /** @member {StoreRecordId} */
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
        return this._fieldErrors ?? {};
    }

    /** @return {number} - count of all validation errors for the record. */
    @computed
    get errorCount() {
        return flatten(values(this._fieldErrors)).length;
    }

    /** @return {boolean} - true if any fields are currently recomputing their validation state. */
    @computed
    get isPending() {
        return this._validationTask.isPending;
    }

    /**
     * @param {Object} c - RecordValidator configuration.
     * @param {StoreRecord} c.record - record to validate
     */
    constructor({record}) {
        this.record = record;
        makeObservable(this);
    }

    /**
     * Recompute validations for the record and return true if valid.
     * @returns {Promise<boolean>}
     */
    async validateAsync() {
        let runId = ++this._validationRunId,
            fieldErrors = {},
            {record} = this,
            fieldsToValidate = record.store.fields.filter(it => !isEmpty(it.rules));

        const promises = fieldsToValidate.flatMap(field => {
            fieldErrors[field.name] = [];
            return field.rules.map(async (rule) => {
                const result = await this.evaluateRuleAsync(record, field, rule);
                fieldErrors[field.name].push(result);
            });
        });
        await Promise.all(promises).linkTo(this._validationTask);

        if (runId !== this._validationRunId) return;
        fieldErrors = mapValues(fieldErrors, it => compact(flatten(it)));

        runInAction(() => this._fieldErrors = fieldErrors);

        return this.isValid;
    }

    /** @return {ValidationState} - the current validation state for the record. */
    getValidationState() {
        const VS = ValidationState,
            {_fieldErrors} = this;

        if (_fieldErrors === null) return VS.Unknown; // Before executing any rules

        return (values(_fieldErrors).some(errors => !isEmpty(errors))) ?
            VS.NotValid :
            VS.Valid;
    }

    async evaluateRuleAsync(record, field, rule) {
        const values = record.getValues(),
            {name, displayName} = field,
            value = record.get(name);

        if (this.ruleIsActive(record, field, rule)) {
            const promises = rule.check.map(async (constraint) => {
                const fieldState = {value, name, displayName, record};
                return await constraint(fieldState, values);
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
}