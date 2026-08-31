/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import type {Field} from '../Field';

/**
 * Shared support for building generated data classes whose values are read through prototype
 * getters - the exposed-leaf getter-class technique from the Cube's `RowDataGenerator`,
 * generalized here for consumption by both the Store and Cube layers.
 *
 * Getters keep all data objects produced by a Store or View on a single generated shape with
 * monomorphic, inlinable reads, and are the delivery mechanism for calculated fields - values
 * computed lazily at read time and therefore always current, never stored, and excluded by
 * construction from the own-property equality and digest contracts used to detect changed
 * records.
 *
 * @internal
 */

/**
 * Install a prototype getter for each calculated field, computing its value at read time via
 * the field's `calculatedFn`.
 *
 * The getter passes the data object itself as the function's first argument, with the layer
 * context (Store or AggregationContext) supplied live by `getContext` - so a value read after
 * later context replacement always computes against the current context.
 */
export function installCalculatedFieldGetters(
    target: object,
    fields: Field[],
    getContext: () => any
) {
    fields.forEach(({name, calculatedFn}) => {
        Object.defineProperty(target, name, {
            get(this: PlainObject) {
                return calculatedFn(this, getContext());
            },
            enumerable: true,
            configurable: true
        });
    });
}

/**
 * Install a prototype getter for each named field, reading through an own `_src` reference to
 * an adopted source data object - avoiding a per-object copy of source values.
 */
export function installSourceFieldGetters(target: object, fieldNames: string[]) {
    fieldNames.forEach(name => {
        Object.defineProperty(target, name, {
            get(this: PlainObject) {
                return this._src[name];
            },
            enumerable: true,
            configurable: true
        });
    });
}
