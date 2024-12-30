/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {Awaitable, PlainObject, Some} from '../../core';
import {castArray} from 'lodash';
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
 * Function to validate a value.
 *
 * @param fieldState - context w/value for the constraint's target Field.
 * @param allValues - current values for all fields in form, keyed by field name.
 * @returns String(s) or array of strings describing errors, or null or undefined if rule passes
 * successfully. May return a Promise of strings for async validation.
 */
export type Constraint<T = any> = (
    fieldState: FieldState<T>,
    allValues: PlainObject
) => Awaitable<Some<string>>;

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
