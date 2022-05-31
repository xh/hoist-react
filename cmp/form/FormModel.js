/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {action, computed, observable, makeObservable} from '@xh/hoist/mobx';
import {ValidationState} from '@xh/hoist/data';
import {throwIf} from '@xh/hoist/utils/js';
import {flatMap, forOwn, map, mapValues, pickBy, some, values, forEach} from 'lodash';
import {FieldModel} from './field/FieldModel';
import {SubformsFieldModel} from './field/SubformsFieldModel';

/**
 * FormModel is the main entry point for Form specification. This Model's `fields` collection holds
 * multiple FieldModel instances, which in turn hold the state of user edited data and the
 * validation rules around editing that data.
 *
 * A complete representation of all fields and data within a Form can be produced via this model's
 * `getData()` method, making it easy to harvest all values for e.g. submission to a server.
 *
 * Individual field values are also available as observables via this model's `values` proxy. An
 * application model can setup a reaction to track changes to any value and execute app-specific
 * logic such as disabling one field based on the state of another, or setting up cascading options.
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
export class FormModel extends HoistModel {

    /** @member {Object} - container object for FieldModel instances, keyed by field name. */
    @observable.ref fields = {};

    /** @return {FieldModel[]} - all FieldModel instances, as an array. */
    @managed
    get fieldList() {return values(this.fields)}

    /** @member {FormModel} */
    parent = null;

    /** @member {boolean} */
    @observable disabled;

    /** @member {boolean} */
    @observable readonly;

    _valuesProxy = this.createValuesProxy();

    /**
     * @return {Object} - proxy for access to observable field values, keyed by field name.
     *
     * Read field value(s) off of this object within a reaction's track or component render function
     * to react to changes to those specific values - e.g. to disable one field based on the value
     * of another. This proxy is also passed to validation rules to facilitate reactive cross-field
     * validation - e.g. marking a field as invalid due to a change in another.
     *
     * {@see getData()} instead if you need to get or react to the values of *any/all* fields.
     */
    get values() {
        return this._valuesProxy;
    }

    /**
     * @param {Object} c - FormModel configuration.
     * @param {(FieldModel[]|Object[])} [c.fields] - FieldModels, or configurations to create them,
     *      for all data fields managed by this FormModel.
     * @param {Object} [c.initialValues] - Map of initial values for fields in this model.
     * @param {boolean} disabled
     * @param {boolean} readonly
     */
    constructor(
        {
            fields = [],
            initialValues = {},
            disabled = false,
            readonly = false
        } = {}) {
        super();
        makeObservable(this);
        this.disabled = disabled;
        this.readonly = readonly;
        const models = {};
        fields.forEach(f => {
            const model = f instanceof FieldModel ? f : (f.subforms ? new SubformsFieldModel(f) : new FieldModel(f)),
                {name} = model;
            throwIf(models[name], 'Form cannot contain multiple fields with same name: ' + name);
            models[name] = model;
        });
        this.fields = models;

        this.init(initialValues);

        // Set the owning formModel *last* after all fields in place with data.
        // This (currently) kicks off the validation and other reactivity.
        forOwn(this.fields, f => f.formModel = this);
    }

    /**
     * @param {string} fieldName
     * @return {FieldModel}
     */
    getField(fieldName) {
        return this.fields[fieldName];
    }

    /**
     * @return {Object} - snapshot of current field values, keyed by field name.
     *
     * Call within a reaction's track or component render function to react to *any* field change.
     * {@see values} instead if you need to get or react to the value of a *single* field.
     *
     * @param {boolean} [dirtyOnly] - true to include only dirty field values in the return
     */
    getData(dirtyOnly = false) {
        const fields = dirtyOnly ? pickBy(this.fields, f => f.isDirty) : this.fields;
        return mapValues(fields, v =>  v.getData());
    }

    /**
     * Reset fields to initial values and reset validation.
     *
     * This is typically used by interfaces to restore a 'dirty' user-modified form to a state
     * where all field values are at their initial values.
     */
    @action
    reset() {
        forOwn(this.fields, m => m.reset());
    }

    /**
     * Set the initial value of all fields and reset the form.
     *
     * This is the main programmatic entry point for loading new data (or an empty new record)
     * into the form for editing. If initial values are undefined for any field, the original
     * initial values specified during model construction will be used.
     *
     * @param {Object} initialValues - map of field name to value.
     */
    @action
    init(initialValues = {}) {
        forOwn(this.fields, m => m.init(initialValues[m.name]));
    }

    /**
     * Set the value of one or more fields on this form.
     *
     * @param {Object} values - map of field name to value.
     */
    @action
    setValues(values) {
        const {fields} = this;
        forEach(values, (v, k) => fields[k]?.setValue(v));
    }

    /** @return {boolean} - true if any fields have been changed since last reset/init. */
    @computed
    get isDirty() {
        return some(this.fields, m => m.isDirty);
    }

    /** @param {boolean} readonly */
    @action
    setReadonly(readonly) {
        this.readonly = readonly;
    }

    /** @param {boolean} disabled */
    @action
    setDisabled(disabled) {
        this.disabled = disabled;
    }

    //-----------------------------------
    // Focus Management
    //-----------------------------------
    /**
     * The Field that is currently focused on this form.
     *
     * @see FieldModel.focus() for important information on this method
     * and its limitations.
     *
     * @return {FieldModel}
     */
    @computed
    get focusedField() {
        return this.fieldList.find(f => f.hasFocus);
    }

    /**
     * Focus a field on this form.
     *
     * @param {string} - name of field to focus.
     *
     * @see FieldModel.focus() for important information on this method
     * and its limitations.
     */
    focusField(name) {
        this.getField(name)?.focus();
    }

    //------------------------
    // Validation
    //------------------------
    /** @return {ValidationState} - the current validation state. */
    @computed
    get validationState() {
        const VS = ValidationState,
            states = map(this.fields, m => m.validationState);
        if (states.includes(VS.NotValid)) return VS.NotValid;
        if (states.includes(VS.Unknown)) return VS.Unknown;
        return VS.Valid;
    }

    /** @return {boolean} - true if any fields are currently recomputing their validation state. */
    @computed
    get isValidationPending() {
        return some(this.fields, m => m.isValidationPending);
    }

    /** @return {boolean} - true if all fields are valid. */
    get isValid() {
        return this.validationState == ValidationState.Valid;
    }

    /** @return {string[]} - list of all validation errors for this form. */
    get allErrors() {
        return flatMap(this.fields, s => s.allErrors);
    }

    /**
     * Recompute all validations and return true if the form is valid.
     *
     * @param {Object} [c]
     * @param {boolean} [c.display] - true to trigger the display of validation errors (if any)
     *      by bound FormField components after validation is complete.
     * @return {Promise<boolean>}
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
                if (field) return field.getDataOrProxy();

                const parent = (name === 'parent' ? me.parent : null);
                if (parent) return parent.values;

                return undefined;
            }
        });
    }
}
