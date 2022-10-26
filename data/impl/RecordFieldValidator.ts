/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {HoistBase, managed, TaskObserver} from '@xh/hoist/core';
import {Field, Rule, StoreRecord, ValidationState} from '@xh/hoist/data';
import {computed, makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {compact, flatten, isEmpty, isNil} from 'lodash';

/**
 * Computes validation state for a Field on a StoreRecord instance.
 * @internal
 */
export class RecordFieldValidator extends HoistBase {

    record: StoreRecord;
    field: Field;

    get id(): string {
        return this.field.name;
    }

    get rules(): Rule[] {
        return this.field.rules;
    }

    /** True if the field is confirmed to be Valid. */
    @computed
    get isValid(): boolean {
        return this.validationState === 'Valid';
    }

    /** True if the field is confirmed to be NotValid. */
    @computed
    get isNotValid(): boolean {
        return this.validationState === 'NotValid';
    }

    /** The current validation state of the field. */
    @computed
    get validationState(): ValidationState {
        return this.getValidationState();
    }

    /** All validation errors for the field. */
    @computed.struct
    get errors(): string[] {
        return this.getErrorList();
    }

    /** Count of all validation errors for the field. */
    @computed
    get errorCount(): number {
        return this.errors.length;
    }

    /** True if any rules are currently recomputing their validation state. */
    get isPending(): boolean {
        return this._validationTask.isPending;
    }

    // An array with the result of evaluating each rule. Each element will be array of strings
    // containing any validation errors for the rule. If validation for the rule has not
    // completed will contain null
    @observable
    private _errors;

    @managed
    private _validationTask = TaskObserver.trackLast();

    private _validationRunId = 0;

    constructor(config: {record: StoreRecord, field: Field}) {
        super();
        makeObservable(this);
        this.record = config.record;
        this.field = config.field;
        this._errors = this.rules.map(() => null);
    }

    /**
     * Recompute validations for the record field and return true if valid.
     */
    async validateAsync(): Promise<boolean> {
        await this.evaluateAsync().linkTo(this._validationTask);
        return this.isValid;
    }

    /** The current validation state for the record field. */
    getValidationState(): ValidationState {
        const VS = ValidationState,
            {_errors} = this;
        if (_errors.some(e => !isEmpty(e))) return VS.NotValid;
        if (_errors.some(e => isNil(e))) return VS.Unknown;
        return VS.Valid;
    }

    /** All validation errors for this field. */
    getErrorList(): string[] {
        return compact(flatten(this._errors));
    }

    //---------------------------------------
    // Implementation
    //---------------------------------------
    private async evaluateAsync() {
        const runId = ++this._validationRunId;
        const promises = this.rules.map(async (rule, idx) => {
            const result = await this.evaluateRuleAsync(rule);
            if (runId === this._validationRunId) {
                runInAction(() => this._errors[idx] = result);
            }
        });
        await Promise.all(promises).linkTo(this._validationTask);
    }

    private async evaluateRuleAsync(rule: Rule) {
        const {record, field} = this;
        if (this.ruleIsActive(rule)) {
            const promises = rule.check.map(async (constraint) => {
                const {name, displayName} = field,
                    value = record.get(name),
                    fieldState = {value, name, displayName, record};

                return await constraint(fieldState, record.getValues());
            });

            const ret = await Promise.all(promises);
            return compact(flatten(ret));
        }
        return [];
    }

    private ruleIsActive(rule: Rule): boolean {
        const {record, field} = this,
            {when} = rule;
        return !when || when(field, record.getValues());
    }
}
