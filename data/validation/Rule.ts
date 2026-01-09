/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Constraint, RuleSpec, Validation, ValidationSeverity, When} from '@xh/hoist/data';
import {castArray, groupBy, isEmpty} from 'lodash';

/**
 * Immutable object representing a validation rule.
 */
export class Rule {
    readonly check: Constraint[];
    readonly when: When;

    constructor(spec: RuleSpec) {
        this.check = castArray(spec.check);
        this.when = spec.when;
    }
}

/**
 * Utility to determine the maximum severity from a list of validations.
 *
 * @param validations - list of Validation objects
 * @returns The highest severity level found, or null if none.
 */
export function maxSeverity(validations: Validation[]): ValidationSeverity {
    if (isEmpty(validations)) return null;
    const bySeverity = groupBy(validations, 'severity');
    if ('error' in bySeverity) return 'error';
    if ('warning' in bySeverity) return 'warning';
    if ('info' in bySeverity) return 'info';
    return null;
}
