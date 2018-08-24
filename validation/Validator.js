/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable} from '@xh/hoist/mobx';
import {flatten, without, castArray} from 'lodash';
import {PendingTaskModel} from '@xh/hoist/utils/async/PendingTaskModel';

/**
 * Monitors a specific field in a model maintaining its current validation state.
 */
@HoistModel()
export class Validator {

    /** @member {string} name of observable field within model targeted by this validator. */
    field;
    /** @member {Object} model targeted by this validator. */
    model;
    /** @member {Rules[]} list of rules to apply to this field.  */
    rules;
    /** @member {String[]} list of errors, or null if the field is valid. */
    @observable.ref errors

    _taskModel = new PendingTaskModel();
    _runId = 0;

    /** Is the field currently valid? */
    get isValid() {
        return errors == null;
    }

    /**
     * Is the validation of the field currently pending?
     *
     * Return true if this model is awaiting completion.
     * If true, the current state may be out of date and should be
     * considered provisional.
     */
    get isPending() {
        return this._taskModel.isPending;
    }

    /**
     * @param {Object} cfg - config for this object
     * @param {string} cfg.field - name of field to validate.
     * @param {Object} cfg.model - model being validated.
     * @param {(Rule|Rule[])} cfg.rules - rules (or rule) to apply to this field
     */
    constructor({field, model, rules}) {
        this.field = field;
        this.model = model;
        this.rules = castArray(rules);
        this.addAutoRun(() => {
            const runId = ++this._runId;
            this.evaluateAsync(rules)
                .thenAction(errors => {
                    if (runId != this._runId) return;
                    this.errors = errors;
                }).linkTo(this._taskModel);
        });
    }

    //-------------------------------
    // Helpers for Rule evaluation.
    //-------------------------------
    /**
     * Current value of field targeted by this validator.
     */
    get value() {
        return this.model[this.field];
    }

    /** Display name of field targeted by this validator. */
    get displayName() {
        const {field, model} = this,
            {displayNames} = model,
            displayName = displayNames && displayNames[field];

        return displayName || field;
    }

    //--------------------------
    // Implementation
    // -------------------------
    async evaluateAsync(rules) {
        const promises = rules.map(it => it.evaluateAsync(this));
        let  ret = await Promises.all(promises);
        ret = flatten(without(ret, null));
        return ret.length ? ret : null;
    }
}
