/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {isArray, flatMap} from 'lodash';
import {action, computed} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';

import {FormModel} from '../FormModel';
import {FieldModel} from './FieldModel';
import {ValidationState} from '../validation/ValidationState';

/**
 * A data field in a form whose value is a collection of FormModels (subforms).
 *
 * Applications should populate the contents of this collection by setting the value property of
 * this object to an array of FormModels. Apps should *not* modify the existing value property.
 *
 * Validation rules for the entire collection may be specified as for any field, but validations on
 * the subform will also bubble up to this field, affecting its overall validation state.
 */
export class SubformsFieldModel extends FieldModel {

    get subforms() {
        return this.value || [];
    }

    //-----------------------------
    // Overrides
    //-----------------------------
    get values() {
        return this.subforms.map(s => s.values);
    }

    getData() {
        return this.subforms.map(s => s.getData());
    }

    @action
    setValue(v) {
        throwIf(v && (!isArray(v) || v.some(s => !(s instanceof FormModel))), 'Subform field must contain forms.');
        super.setValue(v);
        this.subforms.forEach(s => s.parent = this.formModel);
    }

    set formModel(formModel) {
        super.formModel = formModel;
        this.subforms.forEach(s => s.parent = formModel);
    }

    @computed
    get allErrors() {
        const {errors} = this,
            subErrs = flatMap(this.subforms, s => s.allErrors);
        return errors ? [...errors, subErrs] : subErrs;
    }

    @action
    reset() {
        super.reset();
        this.subforms.forEach(s => s.reset());
    }

    @action
    displayValidation(includeSubforms = true) {
        super.displayValidation(includeSubforms);
        if (includeSubforms) {
            this.subforms.forEach(s => s.displayValidation());
        }
    }

    @computed
    get validationState() {
        const VS = ValidationState,
            states = this.subforms.map(s => s.validationState);
        states.push(super.validationState);

        if (states.includes(VS.NotValid)) return VS.NotValid;
        if (states.includes(VS.Unknown))  return VS.Unknown;
        return VS.Valid;
    }

    @computed
    get isValidationPending() {
        return this.subforms.some(m => m.isValidationPending) || super.isValidationPending;
    }

    @computed
    get isDirty() {
        return this.subforms.some(s => s.isDirty) || super.isDirty;
    }

    @action
    async validateAsync({display = true} = {}) {
        const promises = this.subforms.map(m => m.validateAsync({display}));
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

    destroy() {
        XH.safeDestroy(this.subforms);
    }
}