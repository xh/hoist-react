/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Constraint, RuleSpec, ValidationResult, ValidationSeverity, When} from '@xh/hoist/data';
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
 * Utility to determine the maximum severity from a list of ValidationResults.
 *
 * @param validationResults - list of ValidationResults to evaluate.
 * @returns The highest severity level found, or null if none.
 */
export function maxSeverity(validationResults: ValidationResult[]): ValidationSeverity {
    if (isEmpty(validationResults)) return null;
    const bySeverity = groupBy(validationResults, 'severity');
    if ('error' in bySeverity) return 'error';
    if ('warning' in bySeverity) return 'warning';
    if ('info' in bySeverity) return 'info';
    return null;
}
