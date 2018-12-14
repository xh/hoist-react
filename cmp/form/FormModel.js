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
 * Co-ordinates support for the specification and control of a collection of fields which
 * constituite the state of this Form.
 */
@HoistModel
export class FormModel {

    name = null

    /** @member {FieldModel[]} - all fields in this model. */
    @observable.ref
    fields = [];

    /** @member {FormModel} - parent form model, or null. */
    parent = null;

    /** @member {FormModel[]} - all child models in this model. */
    @observable.ref
    children = [];

    @computed
    get members() {
        return [...this.fields, ...this.children];
    }

    /**
     *  @member {Object} -- proxy for accessing all of the current data values
     *  in this form, and related forms.  Passed to validation rules to facilitate
     *  observable cross-field validation.
     */
    dataProxy;

    constructor({name = 'form', fields = [], children = []} = {}) {
        this.dataProxy = this.createDataProxy();
        fields.forEach(it => this.addField(it));
        children.forEach(it => this.addChild(it));
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

    @action
    addChild(child) {
        child = child instanceof FormModel ? child : new FormModel(child);
        throwIf(this.getMember(child.name), `Form already has member with name ${name}`);
        child.parent = this;
        this.children = [...this.children, child];
    }

    getMember(name) {
        return find(this.members, {name});
    }

    getField(name) {
        return find(this.fields, {name});
    }

    getChild(name) {
        return find(this.children, {name});
    }

    /**
     * Reset fields to initial values and reset validation.
     */
    reset() {
        this.members.forEach(m => m.reset());
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
        this.members.forEach(m => m.init(initialValues[m.name]));
    }

    //--------------------------
    // Validation
    //---------------------------
    /** @member {ValidationState} - the current validation state. */
    @computed
    get validationState() {
        const VS = ValidationState,
            states = this.members.map(m => m.validationState);
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
        return this.members.some(m => m.isValidationPending);
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
     * Return a resolved validation state of the form, waiting for any pending
     * validations to complete, if necessary.
     *
     * @param {Object} [c]
     * @param {boolean] [c.display] - true to activate validation display
     *      for the form after validation has been peformed.
     *
     * @returns {Promise<ValidationState>}
     */
    async validateAsync({display = true} = {}) {
        const promises = this.members.map(m => m.validateAsync({display}));
        await Promise.all(promises);
        return this.validationState;
    }

    /**
     * Activate Display of all fields.
     */
    displayValidation() {
        this.members.forEach(m => m.displayValidation());
    }

    //----------------------------
    // Dirty State
    //----------------------------
    /**
     * True if any fields have been changed since last reset/initialization.
     */
    isDirty() {
        return this.members.some(m => m.isDirty);
    }

    //---------------------------
    // Implementation
    //---------------------------
    createDataProxy() {
        const me = this;

        return new Proxy({}, {
            get(target, name, receiver) {

                const field = me.getField(name);
                if (field) return field.value;

                const child = me.getChild(name);
                if (child) return child.dataProxy;

                const parent = (name === 'parent' ? me.parent : null);
                if (parent) return parent.dataProxy;

                return undefined;
            }
        });
    }

    destroy() {
        XH.safeDestroy(this.fields, this.children);
    }
}
