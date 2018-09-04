/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel} from '@xh/hoist/core';
import {computed, action} from '@xh/hoist/mobx';
import {values} from 'lodash';

import {ValidationState} from '../validation/ValidationState';


/**
 * Implementation object for FieldsSupport.
 *
 * Allows the observation, cached aggregation, and bulk actions on the
 * state of all the individual fields.
 *
 * @private
 */
@HoistModel()
export class FieldsModel {

    _fields;

    constructor(fields) {
        this._fields = fields;
    }

    @action
    initFields(values) {
        this.fields.forEach(f => {
            f.init(values[f.name]);
        });
    }

    @action
    resetFields() {
        this.fields.forEach(f => f.reset());
    }

    //---------------------
    // Get Field Models
    //-----------------------
    get fields() {
        return values(this._fields);
    }

    getField(name) {
        return this._fields[name];
    }

    //---------------------------
    // Aggregated Validation
    //---------------------------
    @computed
    get validationState() {
        const VS = ValidationState,
            states = this.fields.map(v => v.validationState);
        if (states.includes(VS.NotValid))     return VS.NotValid;
        if (states.includes(VS.Unknown))      return VS.Unknown;
        return VS.Valid;
    }

    @computed
    get isValidationPending() {
        return this.fields.some(it => it.isValidationPending);
    }

    async validateAsync() {
        const promises = this.fields.map(it => it.validateAsync(this));
        await Promise.all(promises);
        return this.validationState;
    }

    //----------------------------
    // Aggregated Dirty State
    //----------------------------
    @computed
    get isDirty() {
        return this.fields.some(it => it.isDirty);
    }

    destroy() {
        XH.safeDestroy(this.fields);
    }
}