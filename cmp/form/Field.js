/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable} from '@xh/hoist/mobx';
import {flatten, isEmpty} from 'lodash';
import {PendingTaskModel} from '@xh/hoist/utils/async/PendingTaskModel';
import {action, computed} from '@xh/hoist/mobx';

import {ValidationState} from './validation/ValidationState';
import {Rule} from './validation/Rule';

/**
 *
 * A data field in a Form.
 *
 * Applications typically create fields using the `@field` decorator on
 * properties of a model marked with @FormSupport.
 */
@HoistModel
export class Field {

    /** @member {string} name of property within model containing this field. */
    name;
    /** @member {Object} model containing the field. */
    model;
    /** @member {*} initial value of this field. */
    initialValue;
    /** @member {string} user visible name for a field.  For use in validation messages and form labelling. */
    @observable displayName;
    /** @member {boolean}.  True to disable input on this field.*/
    @observable disabled;
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

    //-----------------------------
    // Accessors and lifecycle
    //-----------------------------
    /** Current value of field. */
    get value() {
        return this.model[this.name];
    }

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
        this.model[this.name] = this.initialValue;
        this.errors = null;
        this.validationDisplayed = false;
        this.computeValidationAsync();
    }

    /**
     * @param {Object} cfg
     * @param {string} cfg.name
     * @param {Object} cfg.model
     * @param {string} cfg.displayName
     * @param {(Object|Object[])} [cfg.rules] - Rule(s) or configuration for rules
     */
    constructor({name, model, displayName, rules=[]}) {
        this.name = name;
        this.model = model;
        this.displayName = displayName;
        this.addRules(...rules);
        this.addAutorun(() => {
            this.computeValidationAsync();
        });
        this.addAutorun(() => {
            if (this.isDirty) this.displayValidation();
        });
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

    /**
     * Add Validation Rules
     * @param {...(Rule|Object)} rules - Rules or configurations to create.
     */
    @action
    addRules(...rules) {
        rules = rules.map(r => r instanceof Rule ? r : new Rule(r));
        this.rules = this.rules.concat(rules);
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
    computeValidationAsync() {
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
        const promises = rules.map(it => it.evaluateAsync(this));
        return flatten(await Promise.all(promises));
    }
}
