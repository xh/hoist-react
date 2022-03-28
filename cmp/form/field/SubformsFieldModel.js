/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {managed, XH} from '@xh/hoist/core';
import {ValidationState} from '@xh/hoist/data';
import {action, computed, makeObservable, override} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {clone, defaults, isEqual, flatMap, isArray, partition, without} from 'lodash';
import {executeIfFunction, withDefault} from '../../../utils/js';
import {FormModel} from '../FormModel';
import {BaseFieldModel} from './BaseFieldModel';

/**
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
 * validations on the subforms will also bubble up to this field, affecting its overall
 * validation state.
 */
export class SubformsFieldModel extends BaseFieldModel {

    // (Sub)FormModels created by this model, tracked to support cleanup.
    @managed _createdModels = [];
    _modelConfig = null;

    /**
     * @param {Object} c - FieldModel configuration.
     * @param {Object} c.subforms - config for FormModel representing a subform.
     * @param {Object[]} [c.initialValue] - initial value of this field.  If a function, will be
     *      executed dynamically when form is initialized to provide value.
     * @param {...} c.rest - arguments for BaseFieldModel
     */
    constructor({subforms, initialValue = [],  ...rest}) {
        super({...rest});
        makeObservable(this);
        this._modelConfig = subforms;
        this._origInitialValue = initialValue;
        this.init(initialValue);
    }

    //-----------------------------
    // Overrides
    //-----------------------------
    get hasFocus() {return false}
    focus() {}
    blur() {}

    getDataOrProxy() {
        return this.value.map(s => s.values);
    }

    getData() {
        return this.value.map(s => s.getData());
    }

    @override
    init(value) {
        value = executeIfFunction(withDefault(value, this._origInitialValue));
        this.initialValue = this.parseValue(value);
        this.reset();
        this.cleanupModels();
    }

    @override
    setValue(v) {
        super.setValue(this.parseValue(v));
        this.cleanupModels();
    }

    get formModel() {
        return super.formModel;  // Need to define setter/getter pair together - see below.
    }

    set formModel(formModel) {
        super.formModel = formModel;
        this.value.forEach(s => s.parent = formModel);

        this.addAutorun(() => {
            const {disabled, readonly, value} = this;
            value.forEach(sub => {
                sub.setDisabled(disabled);
                sub.setReadonly(readonly);
            });
        });
    }

    @computed
    get allErrors() {
        const subErrs = flatMap(this.value, s => s.allErrors);
        return [...this.errors, ...subErrs];
    }

    @override
    reset() {
        super.reset();
        this.value.forEach(s => s.reset());
    }

    @override
    displayValidation(includeSubforms = true) {
        super.displayValidation(includeSubforms);
        if (includeSubforms) {
            this.value.forEach(s => s.displayValidation());
        }
    }

    @computed
    get isValidationPending() {
        return this.value.some(m => m.isValidationPending) || super.isValidationPending;
    }

    @computed
    get isDirty() {
        // Catch changed values within subforms, as well as adds/deletes/sorts
        const {value, initialValue} = this;
        return (
            value.some(s => s.isDirty) ||
            !isEqual(initialValue.map(s => s.getData()), value.map(s => s.getData()))
        );
    }

    @override
    async validateAsync({display = true} = {}) {
        const promises = this.value.map(m => m.validateAsync({display}));
        promises.push(super.validateAsync({display}));
        await Promise.all(promises);
        return this.isValid;
    }

    //-----------------------------
    // Collection management
    //-----------------------------
    /**
     * Add a new record (subform) to this field.
     *
     * @param {Object} [initialValues] - object containing initial values for new record.
     * @param {number} [index] - index in collection where subform should be inserted.
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

    deriveValidationState() {
        const VS = ValidationState,
            states = this.value.map(s => s.validationState);
        states.push(super.deriveValidationState());

        if (states.includes(VS.NotValid)) return VS.NotValid;
        if (states.includes(VS.Unknown)) return VS.Unknown;
        return VS.Valid;
    }
}
