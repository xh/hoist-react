/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable, when} from '@xh/hoist/mobx';
import {flatten, isEmpty} from 'lodash';
import {PendingTaskModel} from '@xh/hoist/utils/async/PendingTaskModel';
import {action, computed} from '@xh/hoist/mobx';

import {ValidationState} from './validation/ValidationState';
import {Rule} from './validation/Rule';

/**
 * Maintains state relating to a property marked with `@field` decorator.
 */
@HoistModel
export class Field {

    /** @member {string} name of property within model containing this field. */
    name;
    /** @member {Object} model containing the field. */
    model;
    /** @member {string} user visible name for a field.  For use in validation messages and form labelling. */
    displayName;
    /** @member {*} initial value of this field. */
    initialValue;
    /** @member {Rule[]} list of validation rules to apply to this field. */
    @observable.ref rules = [];
    /** @member {String[]} list of validation errors.  Null if the validity state not computed. */
    @observable.ref errors = null;

    /** @member {boolean}
     * Should the GUI currently display this validation? False when a validation is "passive",
     * and activateDisplay() has not yet been called, because the field has not yet been visited
     * or edited since the last reset.
     **/
    @observable displayActive = false;

    _validationTask = new PendingTaskModel();
    _validationRunId = 0;

    //-----------------------------
    // Accessors and lifecycle
    //-----------------------------
    /** Current value of field. */
    get value() {
        return this.model[this.name];
    }

    /** Initialize this field. */
    @action
    init(initialValue = null) {
        this.initialValue = initialValue;
        this.reset();
    }

    /** Reset the field to its initial value and reset validation state. */
    @action
    reset() {
        this.model[this.name] = this.initialValue;
        this.errors = null;
        this.displayActive = false;
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
            this.computeValidation();
        });
        this.addAutorun(() => {
            if (this.isDirty) this.activateDisplay();
        });
    }


    //------------------------------------
    // Validation
    //------------------------------------

    /**
     * Call to indicate the state of this validation should be shown to the user.  Called automatically
     * when field is dirtied.  May also be called manually, e.g. on blur, or when the user requests
     * to move to next page, validate button, etc.
     **/
    @action
    activateDisplay() {
        this._displayActive = true;
    }

    /** Validation state of the field. */
    get validationState() {
        const VS = ValidationState;
        const {errors, rules} = this;
        return (errors == null) ?
            isEmpty(rules) ? VS.Valid : VS.Unknown :
            isEmpty(errors) ? VS.NotValid : VS.Valid;
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
     * @returns {Promise<String>} - the validation state of the object.
     */
    @action
    async validateAsync() {
        await when(() =>  this.validationState != ValidationState.Unknown && !this.validationPending);
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
    computeValidation() {
        const runId = ++this._validationRunId;
        this.evaluateAsync(this.rules)
            .thenAction(errors => {
                if (runId != this._validationRunId) return;
                this.errors = errors;
            }).linkTo(this._validationTask);
    }

    async evaluateAsync(rules) {
        const promises = rules.map(it => it.evaluateAsync(this));
        return flatten(await Promise.all(promises));
    }
}
