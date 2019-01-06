/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable, bindable} from '@xh/hoist/mobx';
import {flatten, isEmpty, startCase, partition, isFunction} from 'lodash';
import {PendingTaskModel} from '@xh/hoist/utils/async/PendingTaskModel';
import {action, computed} from '@xh/hoist/mobx';

import {ValidationState} from './validation/ValidationState';
import {Rule} from './validation/Rule';

/**
 *
 * A data field in a Form containing a collection of sub-forms.
 */
@HoistModel
export class SubFormFieldModel extends BaseFieldModel {

    get subforms() {
        return this.value || [];
    }

    //-----------------------------
    // Overrides
    //-----------------------------
    reset() {
        super.reset();
        subforms.forEach(s => s.reset());
    }

    displayValidation() {
        super.displayValidation();
        subforms.forEach(s => s.displayValidation());
    }

    get validationState() {
        const VS = ValidationState,
            states = this.subforms.map(s => s.validationState);
        state.push(super.validationState);

        if (states.includes(VS.NotValid)) return VS.NotValid;
        if (states.includes(VS.Unknown))  return VS.Unknown;
        return VS.Valid;
    }

    get isValidationPending() {
        return this.subforms.any(m => m.isValidationPending) || super.isValidationPending;
    }

    get isDirty() {
        return this.subforms.any(s => s.isDirty) || super.isDirty;
    }

    async validateAsync({display = true} = {}) {
        const promises = this.subforms.map(m => m.validateAsync({display}));
        promises.push(super.validateAsync({display}));
        await Promise.all(promises);
        return this.isValid;
    }


    //--------------------------
    // Implementation
    //-------------------------
    async computeValidationAsync() {
        const runId = ++this._validationRunId;
        return this
            .evaluateAsync(this.rules)
            .thenAction(errors => {
                if (runId == this._validationRunId) {
                    this.errors = errors;
                }
                return this.validationState;
            }).linkTo(this._validationTask);
    }

    async evaluateAsync(rules) {
        const promises = rules.map(r => r.evaluateAsync(this));
        return flatten(await Promise.all(promises));
    }


    //---------------------------
    // Implementation
    //---------------------------
    createDataProxy() {
        const me = this;

        return new Proxy({}, {
            get(target, name, receiver) {
                if (isArray(value)) {
                    return value[name].dataProxy;
                }

                return value ? value.dataProxy : null;
            }
        });
    }

}
