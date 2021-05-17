/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {compact, flatten} from 'lodash';
import {BaseRule} from './BaseRule';
import {required} from './constraints';

/**
 * Immutable object representing a validation rule for a Form FieldModel.
 */
export class FormFieldRule extends BaseRule {

    /**
     * Compute current set of errors (if any) for this rule.
     * @param {FieldModel} field - field being evaluated.
     * @returns {Promise<string[]>}
     */
    async evaluateAsync(field) {
        if (this.isActive(field)) {
            const promises = this.check.map(it => this.evalConstraintAsync(it, field));
            const ret = await Promise.all(promises);
            return compact(flatten(ret));
        }
        return [];
    }

    /**
     * True if this rule is active and indicates that a value is required.
     */
    requiresValue(field) {
        return this.isActive(field) && this.check.includes(required);
    }

    //------------------------------
    // Implementation
    //------------------------------
    isActive(field) {
        if (!field.formModel) return false;
        const {when} = this;
        return !when || when(field, field.formModel.values);
    }

    async evalConstraintAsync(constraint, field) {
        const {value, displayName} = field,
            fieldState = {value, displayName};
        return await constraint(fieldState, field.formModel.values);
    }
}
