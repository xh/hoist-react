/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    Field,
    Rule,
    StoreRecord,
    StoreRecordId,
    ValidationIssue,
    ValidationState
} from '@xh/hoist/data';
import {computed, observable, makeObservable, runInAction} from '@xh/hoist/mobx';
import {compact, flatten, isEmpty, isString, mapValues, values} from 'lodash';
import {TaskObserver} from '../../core';

/**
 * Computes validation state for a StoreRecord.
 * @internal
 */
export class RecordValidator {
    record: StoreRecord;

    @observable.ref private fieldValidationIssues: RecordValidationIssueMap = null;
    private validationTask = TaskObserver.trackLast();
    private validationRunId = 0;

    get id(): StoreRecordId {
        return this.record.id;
    }

    /** True if the record is confirmed to be Valid (with or without warnings). */
    @computed
    get isValid(): boolean {
        return this.validationState === 'Valid' || this.validationState === 'ValidWithWarnings';
    }

    /** True if the record is confirmed to be Valid but has warnings. */
    @computed
    get isValidWithWarnings(): boolean {
        return this.validationState === 'ValidWithWarnings';
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
    get errors(): RecordValidationMessagesMap {
        return mapValues(this.fieldValidationIssues ?? {}, issues =>
            compact(issues.map(it => (it?.severity === 'error' ? it?.message : null)))
        );
    }

    /** Map of field names to field-level warnings. */
    @computed.struct
    get warnings(): RecordValidationMessagesMap {
        return mapValues(this.fieldValidationIssues ?? {}, issues =>
            compact(issues.map(it => (it?.severity === 'warning' ? it?.message : null)))
        );
    }

    /** Count of all validation errors for the record. */
    @computed
    get errorCount(): number {
        return flatten(values(this.errors)).length;
    }

    /** Count of all validation warnings for the record. */
    @computed
    get warningCount(): number {
        return flatten(values(this.warnings)).length;
    }

    /** True if any fields are currently recomputing their validation state. */
    @computed
    get isPending(): boolean {
        return this.validationTask.isPending;
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
        let runId = ++this.validationRunId,
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
        await Promise.all(promises).linkTo(this.validationTask);

        if (runId !== this.validationRunId) return;
        fieldErrors = mapValues(fieldErrors, it => compact(flatten(it)));

        runInAction(() => (this.fieldValidationIssues = fieldErrors));

        return this.isValid;
    }

    /** The current validation state for the record. */
    getValidationState(): ValidationState {
        if (this.fieldValidationIssues === null) return 'Unknown'; // Before executing any rules
        if (this.errorCount) return 'NotValid';
        if (this.warningCount) return 'ValidWithWarnings';
        return 'Valid';
    }

    async evaluateRuleAsync(
        record: StoreRecord,
        field: Field,
        rule: Rule
    ): Promise<ValidationIssue[]> {
        const values = record.getValues(),
            {name, displayName} = field,
            value = record.get(name);

        if (this.ruleIsActive(record, field, rule)) {
            const promises = rule.check.map(async constraint => {
                const fieldState = {value, name, displayName, record};
                return constraint(fieldState, values);
            });

            const ret = await Promise.all(promises);
            return compact(flatten(ret)).map(issue =>
                isString(issue) ? {message: issue, severity: 'error'} : issue
            );
        }
    }

    ruleIsActive(record: StoreRecord, field: Field, rule: Rule) {
        const {when} = rule;
        return !when || when(field, record.getValues());
    }
}

/** Map of Field names to Field-level ValidationIssue lists. */
export type RecordValidationIssueMap = Record<string, ValidationIssue[]>;
export type RecordValidationMessagesMap = Record<string, string[]>;
