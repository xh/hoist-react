/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {HoistBase, managed} from '@xh/hoist/core';
import {ValidationState} from '@xh/hoist/data';
import {computed, makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {compact, flatten, isEmpty, isNil} from 'lodash';

/**
 * Computes validation state for a Field on a Record instance
 * @private
 */
export class RecordFieldValidator extends HoistBase {

    /** @member {Record} */
    record;

    /** @member {Field} */
    field;

    /** @return {string} */
    get id() {
        return this.field.name;
    }

    /** @return {Rule[]} */
    get rules() {
        return this.field.rules;
    }

    /** @return {boolean} - true if the field is confirmed to be Valid. */
    @computed
    get isValid() {
        return this.validationState === ValidationState.Valid;
    }

    /** @return {boolean} - true if the field is confirmed to be NotValid. */
    @computed
    get isNotValid() {
        return this.validationState === ValidationState.NotValid;
    }

    /** @return {ValidationState} - the current validation state of the field. */
    @computed
    get validationState() {
        return this.getValidationState();
    }

    /** @return {string[]} - all validation errors for the field. */
    @computed.struct
    get errors() {
        return this.getErrorList();
    }

    /** @return {number} - count of all validation errors for the field. */
    @computed
    get errorCount() {
        return this.errors.length;
    }

    /** @return {boolean} - true if any rules are currently recomputing their validation state. */
    get isPending() {
        return this._validationTask.isPending;
    }

    // An array with the result of evaluating each rule. Each element will be array of strings
    // containing any validation errors for the rule. If validation for the rule has not
    // completed will contain null
    @observable _errors;

    @managed _validationTask = new PendingTaskModel();
    _validationRunId = 0;

    /**
     * @param {Object} c - RecordFieldValidator configuration.
     * @param {Record} c.record - Record to validate
     * @param {Field} c.field - Field to validate
     */
    constructor({record, field}) {
        super();
        makeObservable(this);
        this.record = record;
        this.field = field;
        this._errors = this.rules.map(() => null);
    }

    /**
     * Recompute validations for the record field and return true if valid.
     * @returns {Promise<boolean>}
     */
    async validateAsync() {
        await this.evaluateAsync().linkTo(this._validationTask);
        return this.isValid;
    }

    /** @return {ValidationState} - the current validation state for the record field. */
    getValidationState() {
        const VS = ValidationState,
            {_errors} = this;
        if (_errors.some(e => !isEmpty(e))) return VS.NotValid;
        if (_errors.some(e => isNil(e))) return VS.Unknown;
        return VS.Valid;
    }

    /** @member {string[]} - all validation errors for this field. */
    getErrorList() {
        return compact(flatten(this._errors));
    }

    //---------------------------------------
    // Implementation
    //---------------------------------------
    async evaluateAsync() {
        const runId = ++this._validationRunId;
        const promises = this.rules.map(async (rule, idx) => {
            const result = await this.evaluateRuleAsync(rule);
            if (runId === this._validationRunId) {
                runInAction(() => this._errors[idx] = result);
            }
        });
        await Promise.all(promises).linkTo(this._validationTask);
    }

    async evaluateRuleAsync(rule) {
        const {record, field} = this;
        if (this.ruleIsActive(rule)) {
            const promises = rule.check.map(async (constraint) => {
                const {name, displayName} = field,
                    value = record.get(name),
                    fieldState = {value, name, displayName};

                return await constraint(fieldState, record.getValues());
            });

            const ret = await Promise.all(promises);
            return compact(flatten(ret));
        }
        return [];
    }

    ruleIsActive(rule) {
        const {record, field} = this,
            {when} = rule;
        return !when || when(field, record.getValues());
    }
}
