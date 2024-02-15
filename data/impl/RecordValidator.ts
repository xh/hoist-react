/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {Field, Rule, StoreRecord, StoreRecordId, ValidationState} from '@xh/hoist/data';
import {computed, observable, makeObservable, runInAction} from '@xh/hoist/mobx';
import {compact, flatten, isEmpty, mapValues, values} from 'lodash';
import {TaskObserver} from '../../core';

/**
 * Computes validation state for a StoreRecord.
 * @internal
 */
export class RecordValidator {
    record: StoreRecord;

    @observable.ref _fieldErrors: RecordErrorMap = null;
    _validationTask = TaskObserver.trackLast();
    _validationRunId = 0;

    get id(): StoreRecordId {
        return this.record.id;
    }

    /** True if the record is confirmed to be Valid. */
    @computed
    get isValid(): boolean {
        return this.validationState === 'Valid';
    }

    /** True if the record is confirmed to be NotValid. */
    @computed
    get isNotValid(): boolean {
        return this.validationState === 'NotValid';
    }

    /** The current validation state of the record. */
    @computed
    get validationState(): ValidationState {
        return this.getValidationState();
    }

    /** Map of field names to field-level errors. */
    @computed.struct
    get errors(): RecordErrorMap {
        return this._fieldErrors ?? {};
    }

    /** Count of all validation errors for the record. */
    @computed
    get errorCount(): number {
        return flatten(values(this._fieldErrors)).length;
    }

    /** True if any fields are currently recomputing their validation state. */
    @computed
    get isPending(): boolean {
        return this._validationTask.isPending;
    }

    private _validators = [];

    constructor(config: {record: StoreRecord}) {
        this.record = config.record;
        makeObservable(this);
    }

    /**
     * Recompute validations for the record and return true if valid.
     */
    async validateAsync(): Promise<boolean> {
        let runId = ++this._validationRunId,
            fieldErrors = {},
            {record} = this,
            fieldsToValidate = record.store.fields.filter(it => !isEmpty(it.rules));

        const promises = fieldsToValidate.flatMap(field => {
            fieldErrors[field.name] = [];
            return field.rules.map(async rule => {
                const result = await this.evaluateRuleAsync(record, field, rule);
                fieldErrors[field.name].push(result);
            });
        });
        await Promise.all(promises).linkTo(this._validationTask);

        if (runId !== this._validationRunId) return;
        fieldErrors = mapValues(fieldErrors, it => compact(flatten(it)));

        runInAction(() => (this._fieldErrors = fieldErrors));

        return this.isValid;
    }

    /** The current validation state for the record. */
    getValidationState(): ValidationState {
        const {_fieldErrors} = this;

        if (_fieldErrors === null) return 'Unknown'; // Before executing any rules

        return values(_fieldErrors).some(errors => !isEmpty(errors)) ? 'NotValid' : 'Valid';
    }

    async evaluateRuleAsync(record: StoreRecord, field: Field, rule: Rule): Promise<string[]> {
        const values = record.getValues(),
            {name, displayName} = field,
            value = record.get(name);

        if (this.ruleIsActive(record, field, rule)) {
            const promises = rule.check.map(async constraint => {
                const fieldState = {value, name, displayName, record};
                return constraint(fieldState, values);
            });

            const ret = await Promise.all(promises);
            return compact(flatten(ret));
        }
    }

    ruleIsActive(record: StoreRecord, field: Field, rule: Rule) {
        const {when} = rule;
        return !when || when(field, record.getValues());
    }
}

/** Map of Field names to Field-level error lists. */
export type RecordErrorMap = Record<string, string[]>;
