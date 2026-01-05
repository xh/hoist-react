/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, TaskObserver} from '@xh/hoist/core';
import {
    genDisplayName,
    required,
    Rule,
    RuleLike,
    ValidationIssue,
    ValidationState
} from '@xh/hoist/data';
import {action, bindable, computed, makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {executeIfFunction, withDefault} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {compact, flatten, isEmpty, isEqual, isFunction, isNil, isString} from 'lodash';
import {FormModel} from '../FormModel';

export interface BaseFieldConfig {
    /** Unique name for this field within its parent FormModel. */
    name: string;

    /** User-facing name for labels and validation messages. */
    displayName?: string;

    /**
     * Initial value of this field.  If a function, will be executed dynamically when form is
     * initialized to provide value.
     */
    initialValue?: any;

    /** True to disable the input control for this field.*/
    disabled?: boolean;

    /** True to render a read-only value (vs. an input control). */
    readonly?: boolean;

    /** Rules, rule configs, or validation functions to apply to this field. */
    rules?: RuleLike[];
}

/**
 * Abstract Base class for FieldModels.
 *
 * @see FieldModel
 * @see SubformsFieldModel
 */
export abstract class BaseFieldModel extends HoistModel {
    get isFieldModel() {
        return true;
    }

    @observable.ref initialValue: any;
    @bindable.ref value: any;

    name: string;
    @observable displayName: string;
    rules: Rule[] = null;

    /**
     * True to trigger the display of any validation error messages by this
     * model's bound FormField component. False to hide any such messages - even if the value
     * is not in fact valid. This is often preferable when the user has yet to interact with
     * this field since init/reset and eagerly showing validation errors would be confusing.
     */
    @observable validationDisplayed: boolean = false;

    /**
     * The input Component bound to this field.
     *
     * This is an observable property that provides access to the "ref" or "imperativeHandle"
     * of the bound component.
     *
     * This getter is provided to applications as an 'escape hatch' when they need
     * imperative access to the underlying rendering of this FieldModel.
     * Applications should not typically need to use this property.
     *
     * Note that there is no requirement that any input is bound to this FieldModel, or that there
     * is only a single such input.  In the case of multiple bound inputs, no guarantee is
     * provided regarding which one will be returned.
     */
    get boundInput(): any {
        return this.boundInputRef?.current;
    }

    //----------------------
    // Implementation State
    //----------------------
    @observable private _disabled;
    @observable private _readonly;

    private _formModel: FormModel;
    private origInitialValue: any;

    boundInputRef = createObservableRef();

    // An array with the result of evaluating each rule.  Each element will be array of strings
    // containing any validation errors for the rule.  If validation for the rule has not
    // completed will contain null
    @observable
    private validationIssues: ValidationIssue[][];

    @managed
    private validationTask = TaskObserver.trackLast();
    private validationRunId = 0;

    constructor({
        name,
        displayName,
        initialValue = null,
        disabled = false,
        readonly = false,
        rules = []
    }: BaseFieldConfig) {
        super();
        makeObservable(this);
        this.name = name;
        this.displayName = displayName ?? genDisplayName(name);
        this.origInitialValue = initialValue;
        this.value = this.initialValue = executeIfFunction(initialValue);
        this._disabled = disabled;
        this._readonly = readonly;
        this.rules = this.processRuleSpecs(rules);
        this.validationIssues = this.rules.map(() => null);
    }

    //-----------------------------
    // Accessors and lifecycle
    //-----------------------------
    /** Parent FormModel - set via FormModel ctor/addField(). */
    get formModel(): FormModel {
        return this._formModel;
    }

    set formModel(formModel: FormModel) {
        this._formModel = formModel;
        this.addAutorun(() => {
            this.computeValidationAsync();
        });
        this.addAutorun(() => {
            if (this.isDirty) this.displayValidation(false);
        });
    }

    /**
     * Current data/value stored within this field.
     *
     * For standard, single-field FieldModels, returns the current value stored in the field.
     * Overridden by SubformsFieldModels, which return the data for each sub-form in an array.
     */
    getData(): any {
        return this.value;
    }

    get disabled(): boolean {
        return !!(this._disabled || this.formModel?.disabled);
    }

    @action
    setDisabled(disabled: boolean) {
        this._disabled = disabled;
    }

    get readonly(): boolean {
        return !!(this._readonly || this.formModel?.readonly);
    }

    @action
    setReadonly(readonly: boolean) {
        this._readonly = readonly;
    }

    @action
    setValue(v: any) {
        this.value = v;
    }

    /** All validation errors for this field. */
    @computed
    get errors(): string[] {
        return compact(
            flatten(this.validationIssues).map(it => (it?.severity === 'error' ? it.message : null))
        );
    }

    /** All validation warnings for this field. */
    @computed
    get warnings(): string[] {
        return compact(
            flatten(this.validationIssues).map(it =>
                it?.severity === 'warning' ? it.message : null
            )
        );
    }

    /** All validation errors for this field and its sub-forms. */
    get allErrors(): string[] {
        return this.errors;
    }

    /** All validation warnings for this field and its sub-forms. */
    get allWarnings(): string[] {
        return this.warnings;
    }

    /**
     * Set the initial value of the field, reset to that value, and reset validation state.
     *
     * @param value - if undefined, field will be reset to initial value specified
     *      when field was constructed.
     */
    @action
    init(value: any) {
        this.initialValue = executeIfFunction(withDefault(value, this.origInitialValue));
        this.reset();
    }

    /** Reset to the initial value and reset validation state. */
    @action
    reset() {
        this.value = this.initialValue;

        // Force an immediate 'Unknown' state -- the async recompute leaves the old state in place until it completed.
        // (We want that for a value change, but not reset/init)  Force the recompute only if needed.
        this.validationIssues.fill(null);
        wait().then(() => {
            if (!this.isValidationPending && this.validationState === 'Unknown') {
                this.computeValidationAsync();
            }
        });

        this.validationDisplayed = false;
    }

    /** True if value has been changed since last reset/init. */
    get isDirty(): boolean {
        return !isEqual(this.value, this.initialValue);
    }

    //-------------------------
    // Focus
    //-------------------------
    /**
     * Is the bound input associated with this field focused?
     *
     * Note that there is no requirement that any input is bound to this FieldModel, or that there
     * is only a single such input.  In the case of multiple bound inputs, no guarantee is provided
     * regarding which one is consulted by this getter.
     */
    get hasFocus(): boolean {
        return this.boundInput?.hasFocus;
    }

    /**
     * Focus the bound input associated with this field.
     *
     * Note that there is no requirement that any input is bound to this FieldModel, or that there
     * is only a single such input.  In the case of multiple bound inputs, no guarantee is
     * provided regarding which one will be focused.
     */
    focus() {
        const {boundInput} = this;
        if (boundInput?.focus) boundInput.focus();
    }

    /**
     * Blur the bound input associated with this field.
     */
    blur() {
        const {boundInput} = this;
        if (boundInput?.blur) boundInput.blur();
    }

    //------------------------
    // Validation
    //------------------------
    /**
     * Trigger the display of any validation messages by the bound FormField component. Called
     * when validation is requested on the parent FormModel, when the field is dirtied, or when a
     * HoistInput bound to the field is blurred.
     *
     * @param includeSubforms - true to include all subforms of this field.
     */
    @action
    displayValidation(includeSubforms: boolean = true) {
        this.validationDisplayed = true;
    }

    /** Validation state of the field. */
    @computed
    get validationState(): ValidationState {
        return this.deriveValidationState();
    }

    /** True if this field is confirmed to be Valid (with or without warnings). */
    get isValid(): boolean {
        return this.validationState === 'Valid' || this.validationState === 'ValidWithWarnings';
    }

    /** True if this field is confirmed to be Valid but has warnings. */
    get isValidWithWarnings(): boolean {
        return this.validationState === 'ValidWithWarnings';
    }

    /** True if this field is confirmed to be NotValid. */
    get isNotValid(): boolean {
        return this.validationState === 'NotValid';
    }

    /**
     * True if validation of this field is currently pending, in which case
     * the current state is out of date and should be considered provisional.
     */
    get isValidationPending(): boolean {
        return this.validationTask.isPending;
    }

    /**
     * True if this field requires a non-nullish (null or undefined) value,
     * i.e. if there is an active rule with the 'required' constraint.
     */
    @computed
    get isRequired(): boolean {
        return this.rules.some(r => this.ruleIsActive(r) && r.check.includes(required));
    }

    /**
     * Recompute all validations and return true if the field is valid.
     *
     * @param display - true to trigger the display of validation errors (if any)
     *      by the bound FormField component after validation is complete.
     */
    @action
    async validateAsync(opts: {display?: boolean} = {}): Promise<boolean> {
        const {display = true} = opts;
        await this.computeValidationAsync();
        if (display) this.displayValidation();
        return this.isValid;
    }

    //------------------------
    // Implementation
    //------------------------
    // Used by the dynamic FormModel.values proxy to dynamically navigate forms data by name.
    getDataOrProxy() {
        return this.value;
    }

    private processRuleSpecs(ruleSpecs: RuleLike[]): Rule[] {
        return ruleSpecs.map(spec => {
            if (spec instanceof Rule) return spec;
            if (isFunction(spec)) return new Rule({check: spec});
            return new Rule(spec);
        });
    }

    private async computeValidationAsync(): Promise<ValidationState> {
        await this.evaluateAsync().linkTo(this.validationTask);
        return this.validationState;
    }

    private async evaluateAsync() {
        const runId = ++this.validationRunId;
        const promises = this.rules.map(async (rule, idx) => {
            const result = await this.evaluateRuleAsync(rule);
            if (runId === this.validationRunId) {
                runInAction(() => (this.validationIssues[idx] = result));
            }
        });
        await Promise.all(promises);
    }

    private async evaluateRuleAsync(rule: Rule): Promise<ValidationIssue[]> {
        if (this.ruleIsActive(rule)) {
            const promises = rule.check.map(async constraint => {
                const {value, name, displayName} = this,
                    fieldState = {value, name, displayName, fieldModel: this};

                return constraint(fieldState, this.formModel.values);
            });

            const ret = await Promise.all(promises);
            return compact(flatten(ret)).map(issue =>
                isString(issue) ? {message: issue, severity: 'error'} : issue
            );
        }
        return [];
    }

    private ruleIsActive(rule: Rule) {
        if (!this.formModel) return false;
        const {when} = rule;
        return !when || when(this, this.formModel.values);
    }

    protected deriveValidationState(): ValidationState {
        const {errors, warnings, validationIssues} = this;

        if (!isEmpty(errors)) return 'NotValid';
        if (validationIssues.some(e => isNil(e))) return 'Unknown';
        if (!isEmpty(warnings)) return 'ValidWithWarnings';
        return 'Valid';
    }
}
