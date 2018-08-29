/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable} from '@xh/hoist/mobx';
import {flatten} from 'lodash';
import {PendingTaskModel} from '@xh/hoist/utils/async/PendingTaskModel';
import {action} from '@xh/hoist/mobx';

import {ValidationState} from './ValidationState';
/**
 * Monitors a specific field in a model maintaining its current validation state.
 */
@HoistModel()
export class Validator {

    /** @member {string} observable field within model targeted by this validator. */
    field;
    /** @member {Object} model targeted by this validator. */
    model;
    /** @member {Rules[]} list of rules to apply to this field.  */
    @observable.ref rules=[];
    /** @member {String[]} list of errors.  Null if the validity state not computed. */
    @observable.ref errors = null;

    @observable _running = false;
    _taskModel = new PendingTaskModel();
    _runId = 0;

    /** Validation state of the field.*/
    get state() {
        const VS = ValidationState;
        const {errors, _running} = this;

        if (!_running || errors == null) return VS.Unknown;

        return errors.length ? VS.NotValid : VS.Valid;
    }

    /** Is the state of this field ValidationState.Valid **/
    get isValid() {
        return this.state == ValidationState.Valid;
    }

    /** Is the state of this field ValidationState.NotValid **/
    get isNotValid() {
        return this.state == ValidationState.NotValid;
    }

    /**
     * Is the validation of the field currently pending?
     *
     * Return true if this validator is awaiting completion of a re-evaluation.
     * If true, the current state is out of date and should be considered provisional.
     */
    get isPending() {
        return this._taskModel.isPending;
    }

    /**
     * Is the validator currently running?
     */
    get isRunning() {
        return this._running;
    }

    /**
     * Add rules
     * @param {Rule[]} rules
     */
    addRules(rules) {
        this.rules = this.rules.concat(rules);
    }

    /**
     * Start the validator.
     */
    @action
    start() {
        this._running = true;
    }

    /**
     * Reset the validator, stopping its evaluation and clearing any validation results.
     */
    @action
    reset() {
        this._running = false;
        this._errors = null;
    }

    /**
     * @param {Object} cfg - config for this object
     * @param {string} cfg.field - name of field to validate.
     * @param {Object} cfg.model - model being validated.
     * @param {(Rule|Rule[])} [cfg.rules] - rules (or rule) to apply to this field
     */
    constructor({field, model, rules=[]}) {
        this.field = field;
        this.model = model;
        this.addRules(rules);
        this.addAutorun(() => this.reactor());
    }

    //-------------------------------
    // Helpers for Rule evaluation.
    //-------------------------------
    /** Current value of field. */
    get value() {
        return this.model[this.field];
    }

    /** Display name of field. */
    get fieldName() {
        return this.model.getFieldName(this.field) || this.field;
    }

    //--------------------------
    // Implementation
    // -------------------------
    reactor() {
        if (!this.isRunning) return;
        
        const runId = ++this._runId;
        this.evaluateAsync(this.rules)
            .thenAction(errors => {
                if (runId != this._runId) return;
                this.errors = errors;
            }).linkTo(this._taskModel);
    }


    async evaluateAsync(rules) {
        const promises = rules.map(it => it.evaluateAsync(this));
        return flatten(await Promise.all(promises));
    }
}
