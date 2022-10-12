/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {castArray} from 'lodash';
import {StoreRecord} from '../StoreRecord';
import {FieldModel} from '../../cmp/form/field/FieldModel';

/**
 * Immutable object representing a validation rule.
 */
export class Rule {

    check: ConstraintCb[];
    when: WhenCb;

    /**
     * @param config - Rule configuration.
     * @param config.check - function(s) to perform validation.
     * @param [config.when] - function to determine when this rule is active.
     *      If not specified rule is considered to be always active.
     */
    constructor(config: {check: ConstraintCb|ConstraintCb[], when?: WhenCb}) {
        this.check = castArray(config.check);
        this.when = config.when;
    }
}

/**
 * @callback ConstraintCb
 * @param fieldState
 * @param map  - current values for all fields in form, keyed by field name.
 * @returns String or array of strings describing errors, or null or undefined if rule passes successfully.
 */
export type ConstraintCb = ((fieldState: FieldState, map: Record<string, any>) => string|string[]|undefined|null);


/**
 * @callback WhenCb
 * @param fieldState
 * @param map - current values for all fields in form, keyed by field name.
 * @returns true if this rule is currently active.
 */
export type WhenCb = ((fieldState: FieldState, map: Record<string, any>) => boolean);


/** Current values for all fields in form, keyed by field name. */
export interface FieldState {
    /** Current value of the field */
    value: any;

    /** Name of the field */
    name: string;

    /** Display name of the field */
    displayName: string;

    /** Record being validated, if validating Store data. */
    record?: StoreRecord;

    /** FieldModel being validated, if validating Form data. */
    fieldModel?: FieldModel
}