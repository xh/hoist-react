/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {BaseFieldModel} from '@xh/hoist/cmp/form';
import type {Awaitable, PlainObject, Some} from '@xh/hoist/core';
import type {Rule, StoreRecord, StoreRecordId} from '@xh/hoist/data';

/**
 * Function to validate a value.
 *
 * @param fieldState - context w/value for the constraint's target Field.
 * @param allValues - current values for all fields in form, keyed by field name.
 * @returns ValidationResult(s) or string(s) describing errors or null / undefined if rule passes.
 * May return a Promise resolving to the same for async validation.
 */
export type Constraint<T = any> = (
    fieldState: FieldState<T>,
    allValues: PlainObject
) => Awaitable<Some<string | ValidationResult>>;

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

export interface ValidationResult {
    severity: ValidationSeverity;
    message: string;
}

export type ValidationSeverity = 'error' | 'warning' | 'info';

/** Map of StoreRecord IDs to StoreRecord-level messages maps. */
export type StoreValidationMessagesMap = Record<StoreRecordId, RecordValidationMessagesMap>;

/** Map of StoreRecord IDs to StoreRecord-level ValidationResults maps. */
export type StoreValidationResultsMap = Record<StoreRecordId, RecordValidationResultsMap>;

/** Map of Field names to Field-level Validation lists. */
export type RecordValidationResultsMap = Record<string, ValidationResult[]>;

/** Map of Field names to Field-level validation message lists. */
export type RecordValidationMessagesMap = Record<string, string[]>;
