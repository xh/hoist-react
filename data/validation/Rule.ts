/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Awaitable, PlainObject, Some} from '../../core';
import {castArray, groupBy, isEmpty} from 'lodash';
import {StoreRecord} from '../StoreRecord';
import {BaseFieldModel} from '../../cmp/form';

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

/**
 * Function to validate a value.
 *
 * @param fieldState - context w/value for the constraint's target Field.
 * @param allValues - current values for all fields in form, keyed by field name.
 * @returns Validation(s) or string(s) describing errors or null / undefined if rule passes.
 * May return a Promise resolving to the same for async validation.
 */
export type Constraint<T = any> = (
    fieldState: FieldState<T>,
    allValues: PlainObject
) => Awaitable<Some<string | Validation>>;

/**
 * Function to determine when to perform validation on a value.
 *
 * @param entity - the entity being evaluated.  Typically a field for store validation or
 *      a BaseFieldModel for Form validation.
 * @param allValues - current values for all fields in form or record, keyed by field name.
 * @returns true if this rule is currently active.
 */
export type When = (entity: any, allValues: PlainObject) => boolean;

export interface FieldState<T = any> {
    /** Current value of the field */
    value: T;

    /** Name of the field */
    name: string;

    /** Display name of the field */
    displayName: string;

    /** Record being validated, if validating Store data. */
    record?: StoreRecord;

    /** FieldModel being validated, if validating Form data. */
    fieldModel?: BaseFieldModel;
}

export interface RuleSpec {
    /** Function(s) to perform validation. */
    check: Some<Constraint>;

    /**
     *  Function to determine when this rule is active.
     *  If not specified rule is considered to be always active.
     */
    when?: When;
}

export type RuleLike = RuleSpec | Constraint | Rule;

export interface Validation {
    severity: ValidationSeverity;
    message: string;
}

export type ValidationSeverity = 'error' | 'warning' | 'info';
