/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel} from '@xh/hoist/core';
import {FieldModel} from '@xh/hoist/cmp/form/FieldModel';
import {observable, computed, action} from '@xh/hoist/mobx';
import {ValidationState} from './validation/ValidationState';
import {throwIf} from '@xh/hoist/utils/js';
import {find} from 'lodash';

/**
 * Backing model for a Form.
 *
 * FormModel is the main entry point for Form specification.  FormModels contain FieldModels
 * ('fields') that hold the state of user edited data, and the validation rules around editing that data.
 * FormModels also contain children forms (i.e. sub-forms).
 *
 * See FieldModel for more information on the state contained within FormModel.
 */
@HoistModel
export class FormModel {

    @observable.ref
    fields = [];

    parent = null;

    /**
     *  @member {Object} -- proxy for accessing all of the current data values
     *  in this form, and related forms.  Passed to validation rules to facilitate
     *  observable cross-field validation.
     */
    dataProxy;

    /**
     *
     * @param {string} [name] - name of this form.  This will be the unique id of
     *      this form in its parent.
     * @param {FieldModel[]} [fields] - all fields in this model.
     */
    constructor({fields = []} = {}) {
        this.dataProxy = this.createDataProxy();
        fields.forEach(it => this.addField(it));
    }

    /**
     * Get a simple map representation of the current data in the form.  Used for
     * reading data from the form programmatically, or submitting data to a server.
     */
    getData() {
        const ret = {};
        this.fields.forEach(m => {
            ret[m.name] = m.getData();
        });
        return ret;
    }

    //----------------------------
    // Add/Remove Members
    //----------------------------
    @action
    addField(field) {
        field = field instanceof FieldModel ? field : new FieldModel(field);
        throwIf(this.getMember(field.name), `Form already has member with name ${name}`);
        field.formModel = this;
        this.fields = [...this.fields, field];
    }

    getField(name) {
        return find(this.fields, {name});
    }

    /**
     * Reset fields to initial values and reset validation.
     */
    reset() {
        this.fields.forEach(m => m.reset());
    }

    /**
     * Set the initial value of all fields, and reset form.
     *
     * If initial values are undefined for any field, existing initial values
     * will be used.
     *
     * This is the main entry point for loading new data (or an empty new record)
     * into the form for editing.
     */
    init(initialValues = {}) {
        this.fields.forEach(m => m.init(initialValues[m.name]));
    }

    //--------------------------
    // Validation
    //---------------------------
    /** @member {ValidationState} - the current validation state. */
    @computed
    get validationState() {
        const VS = ValidationState,
            states = this.fields.map(m => m.validationState);
        if (states.includes(VS.NotValid)) return VS.NotValid;
        if (states.includes(VS.Unknown)) return VS.Unknown;
        return VS.Valid;
    }

    /**
     * True if any of the fields contained in this model are in the process
     * of recomputing their validation state.
     */
    @computed
    get isValidationPending() {
        return this.fields.some(m => m.isValidationPending);
    }

    /** True if all fields are valid. */
    get isValid() {
        return this.validationState == ValidationState.Valid;
    }

    /** True if any fields are not valid. */
    get isNotValid() {
        return this.validationState == ValidationState.NotValid;
    }

    /**
     * Recompute all validations and return true if the form is valid.
     *
     * @param {Object} [c]
     * @param {boolean] [c.display] - true to activate validation display
     *      for the form after validation has been peformed.
     *
     * @returns {Promise<boolean>}
     */
    async validateAsync({display = true} = {}) {
        const promises = this.fields.map(m => m.validateAsync({display}));
        await Promise.all(promises);
        return this.isValid;
    }

    /**
     * Activate Display of all fields.
     */
    displayValidation() {
        this.fields.forEach(m => m.displayValidation());
    }

    //----------------------------
    // Dirty State
    //----------------------------
    /**
     * True if any fields have been changed since last reset/initialization.
     */
    get isDirty() {
        return this.fields.some(m => m.isDirty);
    }

    //---------------------------
    // Implementation
    //---------------------------
    createDataProxy() {
        const me = this;

        return new Proxy({}, {
            get(target, name, receiver) {

                const field = me.getField(name);
                if (field) return field.dataProxy;

                const parent = (name === 'parent' ? me.parent : null);
                if (parent) return parent.dataProxy;

                return undefined;
            }
        });
    }

    destroy() {
        XH.safeDestroy(this.fields);
    }
}
