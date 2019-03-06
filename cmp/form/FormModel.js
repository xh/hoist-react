/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel} from '@xh/hoist/core';
import {bindable, computed, action, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {flatMap, forOwn, some, mapValues, map, values, pickBy} from 'lodash';

import {ValidationState} from './validation/ValidationState';
import {FieldModel} from './field/FieldModel';
import {SubformsFieldModel} from './field/SubformsFieldModel';


/**
 * Backing model for a Form.
 *
 * FormModel is the main entry point for Form specification. This Model's `fields` collection holds
 * multiple FieldModel instances, which in turn hold the state of user edited data and the
 * validation rules around editing that data.
 *
 * A complete representation of all fields and data within a Form can be produced via this model's
 * `getData()` method, making it easy to harvest all values for e.g. submission to a server.
 *
 * This Model provides an overall validation state, determined by the current validation state of
 * its fields as per their configured rules and constraints.
 *
 * FormModels can be nested via SubformsFieldModels, a specialized type of FieldModel that itself
 * manages a collection of child FormModels. This allows use cases where Forms support editing of
 * dynamic collections of complex objects with their own internal validation rules (e.g. a FormModel
 * representing a market order might have multiple nested FormModels to represent execution splits,
 * where each split has its own internal fields for broker, quantity, and time).
 *
 * @see FieldModel for details on state and validation maintained at the individual field level.
 */
@HoistModel
export class FormModel {

    /** @member {Object} */
    @observable.ref fields = {};
    
    /** @member {FormModel} */
    parent = null;

    /** @member {boolean} */
    @bindable disabled;

    /** @member {boolean} */
    @bindable readonly;

    _valuesProxy = this.createValuesProxy();

    /**
     * @member {Object} - proxy for accessing all of the current data values in this form by name.
     *      Passed to validation rules to facilitate observable cross-field validation.
     */
    get values() {
        return this._valuesProxy;
    }

    /**
     * @param {Object} c - FormModel configuration.
     * @param {(FieldModel[]|Object[])} [c.fields] - FieldModels, or configurations to create them,
     *      for all data fields managed by this FormModel.
     * @param {Object} [c.initialValues] - Map of initial values for fields in this model.
     */
    constructor(
        {
            fields = [],
            initialValues = {},
            disabled = false,
            readonly = false
        } = {}) {
        this.disabled = disabled;
        this.readonly = readonly;
        const models = {};
        fields.forEach(f => {
            const model = f instanceof FieldModel ? f : (f.subforms ? new SubformsFieldModel(f) : new FieldModel(f));
            throwIf(models[model.name], 'Form cannot contain multiple fields with same name: ' + model.name);
            models[model.name] = model;
        });
        this.fields = models;

        this.init(initialValues);

        // Set the owning formModel *last* after all fields in place with data.
        // This (currently) kicks off the validation and other reativity.
        forOwn(this.fields, f => f.formModel = this);
    }

    /**
     * Get the current values for this form, by field name.
     *
     * @param {boolean} [dirtyOnly] -- include only dirty fields.
     * @returns {Object} - a complete map of this model's fields (by name) to their current value.
     */
    getData(dirtyOnly = false) {
        const fields = dirtyOnly ? pickBy(this.fields, f => f.isDirty) : this.fields;
        return mapValues(fields, v =>  v.getData());

    }


    /** Reset fields to initial values and reset validation. */
    @action
    reset() {
        forOwn(this.fields, m => m.reset());
    }

    /**
     * Set the initial value of all fields and reset the form.
     *
     * This is the main entry point for loading new data (or an empty new record) into the form for
     * editing. If initial values are undefined for any field, existing initial values will be used.
     *
     * @param {Object} initialValues - map of field name to value.
     */
    @action
    init(initialValues = {}) {
        forOwn(this.fields, m => m.init(initialValues[m.name]));
    }

    /** @member {boolean} - true if any fields have been changed since last reset/init. */
    @computed
    get isDirty() {
        return some(this.fields, m => m.isDirty);
    }

    //------------------------
    // Validation
    //------------------------
    /** @member {ValidationState} - the current validation state. */
    @computed
    get validationState() {
        const VS = ValidationState,
            states = map(this.fields, m => m.validationState);
        if (states.includes(VS.NotValid)) return VS.NotValid;
        if (states.includes(VS.Unknown)) return VS.Unknown;
        return VS.Valid;
    }

    /** @member {boolean} - true if any fields are currently recomputing their validation state. */
    @computed
    get isValidationPending() {
        return this.fields.some(m => m.isValidationPending);
    }

    /** @member {boolean} - true if all fields are valid. */
    get isValid() {
        return this.validationState == ValidationState.Valid;
    }

    /** @member {boolean} - true if any fields are not valid. */
    get isNotValid() {
        return this.validationState == ValidationState.NotValid;
    }

    /** @member {String[]} - list of all validation errors for this form. */
    get allErrors() {
        return flatMap(this.fields, s => s.allErrors);
    }

    /**
     * Recompute all validations and return true if the form is valid.
     *
     * @param {Object} [c]
     * @param {boolean} [c.display] - true to trigger the display of validation errors (if any)
     *      by bound FormField components after validation is complete.
     * @returns {Promise<boolean>}
     */
    async validateAsync({display = true} = {}) {
        const promises = map(this.fields, m => m.validateAsync({display}));
        await Promise.all(promises);
        return this.isValid;
    }

    /** Trigger the display of validation errors (if any) by bound FormField components. */
    displayValidation() {
        forOwn(this.fields, m => m.displayValidation());
    }

    //------------------------
    // Implementation
    //------------------------
    createValuesProxy() {
        const me = this;
        return new Proxy({}, {
            get(target, name, receiver) {

                const field = me.fields[name];
                if (field) return field.values;

                const parent = (name === 'parent' ? me.parent : null);
                if (parent) return parent.values;

                return undefined;
            }
        });
    }

    destroy() {
        XH.safeDestroy(values(this.fields));
    }
}
