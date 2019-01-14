/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {isArray, flatMap, partition, clone, without, defaults, isUndefined} from 'lodash';
import {action, computed} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';

import {FormModel} from '../FormModel';
import {FieldModel} from './FieldModel';
import {ValidationState} from '../validation/ValidationState';

/**
 *
 * A data field in a form whose value is a collection of FormModels (subforms).
 *
 * Applications should initialize this field with an array of objects.  These values will be
 * loaded into an array of managed FormModels which will form the value of this field.
 *
 * Applications should *not* modify the value property directly, unless they wish to reinitialize
 * all existing form contents to new values.  Use the methods add() or remove() to
 * adjust the contents of the collection while preserving existing form state.
 *
 * Validation rules for the entire collection may be specified as for any field, but
 * validations on the subforms will also bubble up to this field, effecting its overall
 * validation state.
 */
export class SubformsFieldModel extends FieldModel {

    _createdModels = []; // Any subform models created by this model.  Hold on to for cleanup.
    _modelConfig = null;

    /**
     *
     * @param {Object} subforms - config for FormModel representing a subform.
     * @param {Object[]} [cfg.initialValue]
     * @param {...} rest - arguments for FieldModel
     */
    constructor({subforms, initialValue = [],  ...rest}) {
        super({...rest});
        this._modelConfig = subforms;
        this.init(initialValue);
    }

    //-----------------------------
    // Overrides
    //-----------------------------
    get values() {
        return this.value.map(s => s.values);
    }

    getData() {
        return this.value.map(s => s.getData());
    }

    @action
    init(initialValue) {
        if (!isUndefined(initialValue)) {
            this.initialValue = this.parseValue(initialValue);
        }
        this.reset();
        this.cleanupModels();
    }

    @action
    setValue(v) {
        super.setValue(this.parseValue(v));
        this.cleanupModels();
    }

    set formModel(formModel) {
        super.formModel = formModel;
        this.value.forEach(s => s.parent = formModel);
    }

    @computed
    get allErrors() {
        const {errors} = this,
            subErrs = flatMap(this.value, s => s.allErrors);
        return errors ? [...errors, subErrs] : subErrs;
    }

    @action
    reset() {
        super.reset();
        this.value.forEach(s => s.reset());
    }

    @action
    displayValidation(includeSubforms = true) {
        super.displayValidation(includeSubforms);
        if (includeSubforms) {
            this.value.forEach(s => s.displayValidation());
        }
    }

    @computed
    get validationState() {
        const VS = ValidationState,
            states = this.value.map(s => s.validationState);
        states.push(super.validationState);

        if (states.includes(VS.NotValid)) return VS.NotValid;
        if (states.includes(VS.Unknown))  return VS.Unknown;
        return VS.Valid;
    }

    @computed
    get isValidationPending() {
        return this.value.some(m => m.isValidationPending) || super.isValidationPending;
    }

    @computed
    get isDirty() {
        return this.value.some(s => s.isDirty) || super.isDirty;
    }

    @action
    async validateAsync({display = true} = {}) {
        const promises = this.value.map(m => m.validateAsync({display}));
        promises.push(super.validateAsync({display}));
        await Promise.all(promises);
        return this.isValid;
    }

    setDisabled(disabled) {
        throw XH.exception('Disabled not implemented on subform fields');
    }

    setReadonly(readonly) {
        throw XH.exception('Readonly not implemented on subform fields');
    }


    //-----------------------------
    // Collection management
    //-----------------------------
    /**
     * Add a new record (subform) to this field.
     *
     * @param {Object} [initialValue] - object containing initial values for new record.
     * @param {integer} [index] - index in collection where subform should be inserted.
     */
    @action
    add({initialValues = {}, index = this.value.length} = {}) {
        const newSubforms = this.parseValue([initialValues]),
            newValue = clone(this.value);

        newValue.splice(index, 0, ...newSubforms);

        this.value = newValue;
    }

    @action
    remove(formModel) {
        this.value = without(this.value, formModel);
        this.cleanupModels();
    }

    //-----------------------
    // Implementation
    //----------------------
    parseValue(externalVal) {
        throwIf(!isArray(externalVal), 'Value of a SubformsField must be an array.');

        const {_modelConfig, _createdModels} = this;
        return externalVal.map(v => {
            const initialValues = defaults({}, v, _modelConfig.initialValues),
                ret = new FormModel({..._modelConfig, initialValues});
            ret.parent = this.formModel;
            _createdModels.push(ret);
            return ret;
        });
    }

    cleanupModels() {
        // destroy any models we know we are finished with early..
        const {_createdModels, initialValue, value} = this,
            [keep, destroy] = partition(_createdModels, m => initialValue.includes(m) || value.includes(m));
        this._createdModels = keep;
        XH.safeDestroy(destroy);
    }

    destroy() {
        XH.safeDestroy(this._createdModels);
    }
}