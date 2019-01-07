/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel, XH} from '@xh/hoist/core';
import {isArray, isNumber} from 'lodash';
import {action, computed} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';

import {FieldModel} from './FieldModel';
import {ValidationState} from '../validation/ValidationState';

/**
 *
 * A data field in a form whose value is a collection of FormModels (subforms).
 *
 * Applications should populate the contents of this collection by setting the
 * value property of this object to an array of FormModels.  Applications should *not* modify
 * the existing value property.
 *
 * Validation rules for the entire collection may be specified as for any field, but
 * validations on the subform will also bubble up to this field, effecting its overall validation
 * state.
 */
export class SubformFieldModel extends FieldModel {

    dataProxy = this.createDataProxy();

    get subforms() {
        return this.value || [];
    }

    //-----------------------------
    // Overrides
    //-----------------------------
    @action
    setValue(v) {
        throwIf(v && (!isArray(v) || v.any(s => !(s instanceof FormModel))), "Subform field must contain forms.");
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
    displayValidation() {
        super.displayValidation();
        this.subforms.forEach(s => s.displayValidation());
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
        return this.subforms.any(m => m.isValidationPending) || super.isValidationPending;
    }

    @computed
    get isDirty() {
        return this.subforms.any(s => s.isDirty) || super.isDirty;
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

    //---------------------------
    // Implementation
    //---------------------------
    createDataProxy() {
        const me = this;

        return new Proxy({}, {
            get(target, index, receiver) {
                const {value} = me;
                throwIf(!isNumber(index), 'Subform must be dereferenced with a number.');
                throwIf(!isArray(value) || value.length <= index, 'Attempted to access non-existent subform:  ' + name);
                return value[index].dataProxy;
            }
        });
    }

    destroy() {
        XH.safeDestroy(this.subforms);
    }
}