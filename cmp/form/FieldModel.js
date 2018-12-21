/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable, bindable} from '@xh/hoist/mobx';
import {flatten, isEmpty, startCase, partition, isFunction} from 'lodash';
import {PendingTaskModel} from '@xh/hoist/utils/async/PendingTaskModel';
import {action, computed} from '@xh/hoist/mobx';

import {ValidationState} from './validation/ValidationState';
import {Rule} from './validation/Rule';

/**
 *
 * A data field in a Form.
 */
@HoistModel
export class FieldModel {

    /** @member {FormModel} owning field */
    _formModel;

    /** @member {string} name of property within model containing this field. */
    name;
    /** @member {*} initial value of this field. */
    initialValue;
    /** @member {*} value of this field. */
    @bindable value;
    /** @member {string} user visible name for a field.  For use in validation messages and form labelling. */
    @observable displayName;
    /** @member {boolean}.  True to disable input on this field.*/
    @observable disabled;
    /** @member {boolean}.  True to make this field read-only.*/
    @observable readonly;
    /** @member {Rule[]} list of validation rules to apply to this field. */
    @observable.ref rules = [];
    /** @member {String[]} list of validation errors.  Null if the validity state not computed. */
    @observable.ref errors = null;

    /**
     * @member {boolean}
     * Should the GUI currently display this validation? False when a validation is "passive",
     * because, e.g. the field has not yet been visited or edited since the last reset.
     */
    @observable validationDisplayed = false;

    _validationTask = new PendingTaskModel();
    _validationRunId = 0;

    /**
     * @param {Object} cfg
     * @param {string} cfg.name
     * @param {string} [cfg.displayName]
     * @param {boolean} [cfg.readonly]
     * @param {boolean} [cfg.disabled]
     * @param {(Rule|Object|Function)} [cfg.rules] -
     *      Rules, rule configurations, or validation functions to create rules.
     *      (All validation functions supplied will be combined in to a single rule)
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

    /**
     * Owning FormModel for this Field.
     *
     * Not set directly by applications.  See FormModel.addField().
     */
    get formModel() {
        return this._formModel;
    }

    set formModel(formModel) {
        this._formModel = formModel;
        this.addAutorun(() => {
            this.computeValidationAsync();
        });
        this.addAutorun(() => {
            if (this.isDirty) this.displayValidation();
        });
    }


    //-----------------------------
    // Accessors and lifecycle
    //-----------------------------
    /**
     * Set the initial value of the field, reset
     * to that value, and reset validation state.
     */
    @action
    init(initialValue = null) {
        this.initialValue = initialValue;
        this.reset();
    }

    /** Reset to the initial value and reset validation state. */
    @action
    reset() {
        this.value = this.initialValue;
        this.errors = null;
        this.validationDisplayed = false;
        this.computeValidationAsync();
    }

    //------------------------------------
    // Validation
    //------------------------------------
    /**
     * Set the validationDisplayed property.
     *
     * Called automatically when field is dirtied.  May also be called manually by applications
     * e.g. on blur on Focus or when the user requests to move to next page, validate buttons, etc.
     **/
    @action
    displayValidation() {
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

    /** True if this field is confirmed to be Valid. **/
    get isValid() {
        return this.validationState == ValidationState.Valid;
    }

    /** True if this field is confirmed to be NotValid. **/
    get isNotValid() {
        return this.validationState == ValidationState.NotValid;
    }

    /**
     * Is the validation of the field currently pending?
     *
     * Return true if this validator is awaiting completion of a re-evaluation.
     * If true, the current state is out of date and should be considered provisional.
     */
    get isValidationPending() {
        return this._validationTask.isPending;
    }

    /**
     * Is a non-nullish (null or undefined) value for this field required?
     * This getter will return true if there is an active rule with the 'required' constraint.
     */
    @computed
    get isRequired() {
        return this.rules.some(r => r.requiresValue(this));
    }
    
    /**
     * Return a resolved validation state of the field, waiting for any pending
     * validations to complete, if necessary.
     *
     * @param {Object} [c]
     * @param {boolean] [c.display] - true to activate validation display
     *      for the field after validation has been peformed.
     *
     * @returns {Promise<String>} - the validation state of the object.
     */
    @action
    async validateAsync({display = true} = {}) {
        await this.computeValidationAsync();
        if (display) this.displayValidation();
        return this.validationState;
    }

    //------------------------------
    // Dirty State
    //------------------------------
    /** Does the field have changes from its initial state? */
    get isDirty() {
        return this.value !== this.initialValue;
    }

    //--------------------------
    // Implementation
    //-------------------------
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
