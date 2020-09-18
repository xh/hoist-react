/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {Rule, ValidationState} from '@xh/hoist/cmp/form';
import {managed} from '@xh/hoist/core';
import {genDisplayName} from '@xh/hoist/data';
import {action, computed, observable, runInAction} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {PendingTaskModel} from '@xh/hoist/utils/async/PendingTaskModel';
import {withDefault} from '@xh/hoist/utils/js';
import {compact, flatten, isEmpty, isFunction, isNil, isUndefined} from 'lodash';

/**
 * Abstract Base class for FieldModels.
 *
 * @see FieldModel
 * @see SubformsFieldModel
 */
export class BaseFieldModel {

    /** @member {FormModel} */
    _formModel;

    /** @member {*} */
    @observable.ref initialValue;
    /** @member {*} */
    @observable.ref value;

    /** @member {string} */
    name;
    /** @member {string} */
    @observable displayName;

    /** @member {Rule[]} */
    rules = null;

    /**
     * @member {boolean} - true to trigger the display of any validation error messages by this
     *      model's bound FormField component. False to hide any such messages - even if the value
     *      is not in fact valid. This is often preferable when the user has yet to interact with
     *      this field since init/reset and eagerly showing validation errors would be confusing.
     */
    @observable validationDisplayed = false;

    //----------------------
    // Implementation State
    //----------------------
    @observable _disabled;
    @observable _readonly;

    // An array with the result of evaluating each rule.  Each element will be array of strings
    // containing any validation errors for the rule.  If validation for the rule has not
    // completed will contain null
    @observable _errors;

    @managed
    _validationTask = new PendingTaskModel();
    _validationRunId = 0;

    /**
     * @param {Object} c - FieldModel configuration.
     * @param {string} c.name - unique name for this field within its parent FormModel.
     * @param {string} [c.displayName] - user-facing name for labels and validation messages.
     * @param {*} [c.initialValue] - initial value of this field.
     * @param {boolean} [c.disabled] - true to disable the input control for this field.
     * @param {boolean} [c.readonly] - true to render a read-only value (vs. an input control).
     * @param {(Rule[]|Object[]|Function[])} [c.rules] - Rules, rule configs, or validation
     *      functions to apply to this field.
     */
    constructor({
        name,
        displayName,
        initialValue = null,
        disabled = false,
        readonly = false,
        rules = []
    }) {
        this.name = name;
        this.displayName = withDefault(displayName, genDisplayName(name));
        this.value = initialValue;
        this.initialValue = initialValue;
        this._disabled = disabled;
        this._readonly = readonly;
        this.rules = this.processRuleSpecs(rules);
        this._errors = this.rules.map(() => null);
    }

    //-----------------------------
    // Accessors and lifecycle
    //-----------------------------
    /** Parent FormModel - set via FormModel ctor/addField(). */
    get formModel() {
        return this._formModel;
    }

    set formModel(formModel) {
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
    getData() {
        return this.value;
    }

    /** @member {boolean} */
    get disabled() {
        return !!(this._disabled || this.formModel?.disabled);
    }

    @action
    setDisabled(disabled) {
        this._disabled = disabled;
    }

    /** @member {boolean} */
    get readonly() {
        return !!(this._readonly || this.formModel?.readonly);
    }

    @action
    setReadonly(readonly) {
        this._readonly = readonly;
    }

    @action
    setValue(v) {
        this.value = v;
    }

    /** @member {string[]} - all validation errors for this field. */
    @computed
    get errors() {
        return compact(flatten(this._errors));
    }


    /** @member {string[]} - all validation errors for this field and its sub-forms. */
    get allErrors() {
        return this.errors;
    }

    /**
     * Set the initial value of the field, reset to that value, and reset validation state.
     * @param {*} initialValue
     */
    @action
    init(initialValue) {
        if (!isUndefined(initialValue)) {
            this.initialValue = initialValue;
        }
        this.reset();
    }

    /** Reset to the initial value and reset validation state. */
    @action
    reset() {
        this.value = this.initialValue;

        // Force an immediate 'Unknown' state -- the async recompute leaves the old state in place until it completed.
        // (We want that for a value change, but not reset/init)  Force the recompute only if needed.
        this._errors.fill(null);
        wait(0).then(() => {
            if (!this.isValidationPending && this.validationState === ValidationState.Unknown) {
                this.computeValidationAsync();
            }
        });

        this.validationDisplayed = false;
    }

    /** @member {boolean} - true if value has been changed since last reset/init. */
    get isDirty() {
        return this.value !== this.initialValue;
    }

    //------------------------
    // Validation
    //------------------------
    /**
     * Trigger the display of any validation messages by the bound FormField component. Called
     * when validation is requested on the parent FormModel, when the field is dirtied, or when a
     * HoistInput bound to the field is blurred.
     *
     * @param {boolean} [includeSubforms] - true to include all subforms of this field.
     */
    @action
    displayValidation(includeSubforms = true) {
        this.validationDisplayed = true;
    }

    /** Validation state of the field. */
    @computed
    get validationState() {
        return this.deriveValidationState();
    }

    /** @member {boolean} - true if this field is confirmed to be Valid. */
    get isValid() {
        return this.validationState === ValidationState.Valid;
    }

    /** @member {boolean} - true if this field is confirmed to be NotValid. */
    get isNotValid() {
        return this.validationState === ValidationState.NotValid;
    }

    /**
     * @member {boolean} - true if validation of this field is currently pending, in which case
     *      the current state is out of date and should be considered provisional.
     */
    get isValidationPending() {
        return this._validationTask.isPending;
    }

    /**
     * @member {boolean} - true if this field requires a non-nullish (null or undefined) value,
     *      i.e. if there is an active rule with the 'required' constraint.
     */
    @computed
    get isRequired() {
        return this.rules.some(r => r.requiresValue(this));
    }

    /**
     * Recompute all validations and return true if the field is valid.
     *
     * @param {Object} [c]
     * @param {boolean} [c.display] - true to trigger the display of validation errors (if any)
     *      by the bound FormField component after validation is complete.
     * @returns {Promise<boolean>}
     */
    @action
    async validateAsync({display = true} = {}) {
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


    processRuleSpecs(ruleSpecs) {
        return ruleSpecs.map(spec => {
            if (spec instanceof Rule) return spec;
            if (isFunction(spec)) return new Rule({check: spec});
            return new Rule(spec);
        });
    }

    async computeValidationAsync() {
        await this.evaluateAsync().linkTo(this._validationTask);
        return this.validationState;
    }

    async evaluateAsync() {
        const runId = ++this._validationRunId;
        const promises = this.rules.map(async (r, idx) => {
            const result = await r.evaluateAsync(this);
            if (runId === this._validationRunId) {
                runInAction(() => this._errors[idx] = result);
            }
        });
        await Promise.all(promises);
    }

    deriveValidationState() {
        const VS = ValidationState;
        const {_errors} = this;

        if (_errors.some(e => !isEmpty(e))) return VS.NotValid;
        if (_errors.some(e => isNil(e))) return VS.Unknown;
        return VS.Valid;
    }
}
