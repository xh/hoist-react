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
 * Immutable object representing a validation rule for a Store Field.
 */
export class StoreFieldRule extends BaseRule {

    /**
     * Compute current set of errors (if any) for this rule.
     * @param {Field} field - field being evaluated.
     * @param {Record} record - record being evaluated.
     * @returns {Promise<string[]>}
     */
    async evaluateAsync(field, record) {
        if (this.isActive(field, record)) {
            const promises = this.check.map(it => this.evalConstraintAsync(it, field, record));
            const ret = await Promise.all(promises);
            return compact(flatten(ret));
        }
        return [];
    }

    /**
     * True if this rule is active and indicates that a value is required.
     */
    requiresValue(field, record) {
        return this.isActive(field, record) && this.check.includes(required);
    }

    //------------------------------
    // Implementation
    //------------------------------
    isActive(field, record) {
        const {when} = this;
        return !when || when(field, record.getValues());
    }

    async evalConstraintAsync(constraint, field, record) {
        const {name, displayName} = field,
            value = record.get(name),
            fieldState = {value, displayName};

        return await constraint(fieldState, record.getValues());
    }
}
