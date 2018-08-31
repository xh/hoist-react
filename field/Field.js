/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable, when} from '@xh/hoist/mobx';
import {flatten} from 'lodash';
import {PendingTaskModel} from '@xh/hoist/utils/async/PendingTaskModel';
import {action, computed, runInAction} from '@xh/hoist/mobx';

import {ValidationState} from './validation/ValidationState';
import {Rule} from './validation/Rule';


/**
 * Maintains current state relating to a property marked with @field decorator.
 */
@HoistModel()
export class Field {

    /** @member {string} name of property within model containing this field. */
    name;
    /** @member {Object} model containing the field. */
    model;
    /** @member {string} user visible name for a field.  For use in validation messages and form labelling. */
    displayName;
    /** @member {*} initial value of this field. */
    initialValue;
    /** @member {Rules[]} list of validation rules to apply to this field.  */
    @observable.ref rules = [];
    /** @member {String[]} list of validation errors.  Null if the validity state not computed. */
    @observable.ref errors = null;

    @observable _validationRunning = false;
    _validationTask = new PendingTaskModel();
    _validationRunId = 0;
    
    /** Current value of field. */
    get value() {
        return this.model[this.name];
    }

    //------------------------------------
    // Validation
    //------------------------------------
    /** Validation state of the field. */
    get validationState() {
        const VS = ValidationState;
        const {errors, _validationRunning} = this;

        if (!_validationRunning || errors == null) return VS.Unknown;

        return errors.length ? VS.NotValid : VS.Valid;
    }

    /** Is the validation state of this field ValidationState.Valid **/
    get isValid() {
        return this.validationState == ValidationState.Valid;
    }

    /** Is the validation state of this field ValidationState.NotValid **/
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
     * Return a resolved validation state of the field, starting validation if neccessary.
     *
     * Validation on the field will automatically be triggered by an actual change to
     * the field, but can also be triggered manually by this method.  For example,
     * HoistField will trigger this on blur to ensure that fields associated with
     * "visited" inputs are validated, even if they are never changed.
     *
     * @returns {Promise<String>} - the validation state of the object.
     */
    @action
    async validateAsync() {
        this.startValidating();
        await when(() =>  this.validationState != ValidationState.Unknown && !this.validationPending);
        return this.validationState;
    }

    /**
     * Add Validation Rules
     * @param {...Rule} rules
     */
    @action
    addRules(...rules) {
        rules = rules.map(r => r instanceof Rule ? r : new Rule(r));
        this.rules = this.rules.concat(rules);
    }

    //------------------------------
    // Dirty State
    //------------------------------
    /**
     * Does the field have changes from its initial state?
     */
    get isDirty() {
        return this.value !== this.initialValue;
    }

    /**
     * Set the initial value of the field and reset.
     */
    @action
    init(initialValue=null) {
        this.initialValue = initialValue;
        this.reset();
    }

    /**
     * Reset the field, stopping its evaluation and clearing any validation results.
     */
    @action
    reset() {
        this.model[this.name] = this.initialValue;
        this._validationRunning = false;
        this.errors = null;
    }

    @action
    startValidating() {
        this._validationRunning = true;
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
            if (this._validationRunning) this.computeValidation();
        });
        this.addAutorun(() => {
            if (this.isDirty) this.startValidating()
        });
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

