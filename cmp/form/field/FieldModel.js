/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {flatten, isEmpty, startCase, partition, isFunction} from 'lodash';
import {HoistModel} from '@xh/hoist/core';
import {observable, action, computed} from '@xh/hoist/mobx';
import {PendingTaskModel} from '@xh/hoist/utils/async/PendingTaskModel';

import {ValidationState} from '../validation/ValidationState';
import {Rule} from '../validation/Rule';

/**
 * Model for a data field within a Form. Specifies the field's name, user-facing label, validation
 * rules, and other properties. Holds the field's value as initialized by a parent FormModel or
 * updated by a user interacting with a bound FormField component.
 *
 * These models are typically created by passing configuration objects to the constructor or
 * `addField()` method of a parent FormModel. The parent Form/FormModel and the FormField component
 * work together to bind to this model by name.
 */
@HoistModel
export class FieldModel {

    /** @member {FormModel} */
    _formModel;

    /** @member {*} */
    initialValue;
    /** @member {*} */
    @observable.ref value;

    /** @member {string} */
    name;
    /** @member {string} */
    @observable displayName;
    /** @member {boolean} */
    @observable disabled;
    /** @member {boolean} */
    @observable readonly;

    /** @member {Rule[]} */
    @observable.ref rules = [];
    /** @member {String[]} - validation errors, or null if validation has not been run. */
    @observable.ref errors = null;

    /**
     * @member {boolean} - true to trigger the display of any validation error messages by this
     *      model's bound FormField component. False to hide any such messages - even if the value
     *      is not in fact valid. This is often preferable when the user has yet to interact with
     *      this field since init/reset and eagerly showing validation errors would be confusing.
     */
    @observable validationDisplayed = false;

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
     *      functions to apply to this field. (All validation functions supplied will be combined
     *      to create a single Rule.)
     */
    constructor({
        name,
        displayName = startCase(name),
        initialValue = null,
        disabled = false,
        readonly = false,
        rules = []
    }) {
        this.name = name;
        this.displayName = displayName;
        this.value = initialValue;
        this.initialValue = initialValue;
        this.disabled = disabled;
        this.readonly = readonly;
        this.rules = this.processRuleSpecs(rules);
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

    /** Proxy for accessing all of the current data values in this field by name. */
    get values() {
        return this.value;
    }

    /** Current data in this field, fully enumerated. */
    getData() {
        return this.value;
    }

    @action
    setValue(v) {
        this.value = v;
    }

    /** @member {String[]} - all validation errors for this field and its sub-forms. */
    get allErrors() {
        return this.errors || [];
    }

    /**
     * Set the initial value of the field, reset to that value, and reset validation state.
     * @param {*} initialValue
     */
    @action
    init(initialValue = null) {
        this.initialValue = initialValue;
        this.reset();
    }

    /** Reset to the initial value and reset validation state. */
    @action
    reset() {
        this.setValue(this.initialValue);
        this.errors = null;
        this.validationDisplayed = false;
        this.computeValidationAsync();
    }

    /** @member {boolean} - true if value has been changed since last reset/init. */
    get isDirty() {
        return this.value !== this.initialValue;
    }

    //------------------------
    // Disabled/readonly
    //------------------------
    @action
    setDisabled(disabled) {
        this.setDisabled = disabled;
    }

    @action
    setReadonly(readonly) {
        this.setReadonly = readonly;
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
    get validationState() {
        const VS = ValidationState;
        const {errors, rules} = this;
        return (errors == null) ?
            isEmpty(rules) ? VS.Valid : VS.Unknown :
            isEmpty(errors) ? VS.Valid : VS.NotValid;
    }

    /** @member {boolean} - true if this field is confirmed to be Valid. */
    get isValid() {
        return this.validationState == ValidationState.Valid;
    }

    /** @member {boolean} - true if this field is confirmed to be NotValid. */
    get isNotValid() {
        return this.validationState == ValidationState.NotValid;
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
    processRuleSpecs(ruleSpecs) {
        // Peel off raw validations into a single rule spec
        const [constraints, rules] = partition(ruleSpecs, isFunction);
        if (!isEmpty(constraints)) {
            rules.push({check: constraints});
        }
        return rules.map(r => r instanceof Rule ? r : new Rule(r));
    }

    async computeValidationAsync() {
        const runId = ++this._validationRunId;
        return this
            .evaluateAsync(this.rules)
            .thenAction(errors => {
                if (runId == this._validationRunId) {
                    this.errors = errors;
                }
                return this.validationState;
            }).linkTo(this._validationTask);
    }

    async evaluateAsync(rules) {
        const promises = rules.map(r => r.evaluateAsync(this));
        return flatten(await Promise.all(promises));
    }
}
