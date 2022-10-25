/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {castArray} from 'lodash';
import {StoreRecord} from '../StoreRecord';
import {BaseFieldModel} from '../../cmp/form';
import {Field} from '../Field';

/**
 * Immutable object representing a validation rule.
 */
export class Rule {

    check: Constraint[];
    when: When;

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
 * @returns String or array of strings describing errors, or null or undefined if rule passes successfully.
 */
export type Constraint<T=any> = (fieldState: FieldState<T>, allValues: Record<string, any>) => string|string[];


/**
 * Function to determine when to perform validation on a value.
 *
 * @param field - the field (for a StoreRecord) or BaseFieldModel (for a Form) being evaluated.
 * @param allValues - current values for all fields in form, keyed by field name.
 * @returns true if this rule is currently active.
 */
export type When = (field: Field & BaseFieldModel, allValues: Record<string, any>) => boolean;


export interface FieldState<T=any> {
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
    check: Constraint|Constraint[];

    /**
     *  Function to determine when this rule is active.
     *  If not specified rule is considered to be always active.
     */
    when?: When;
}

export type RuleLike = RuleSpec|Constraint|Rule;
