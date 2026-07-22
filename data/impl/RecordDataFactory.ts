/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PlainObject} from '@xh/hoist/core';
import {Field} from '../Field';

/**
 * Factory for constructing StoreRecord `data` objects in V8's optimized "fast properties" mode.
 *
 * V8 stores object properties in one of two modes: "fast" (a shared hidden class with linear
 * property slots, enabling inline caches on property reads) or "dictionary" (a per-object hash
 * table, excluded from inline-cache optimization). Objects that grow by dynamic keyed assignment -
 * as in Store's legacy `Object.create(defaults)` + per-property assignment route - are demoted to
 * dictionary mode once they gain more than ~a dozen dynamically-added properties. Dictionary-mode
 * objects measure 6-8x larger than their fast-mode equivalents at typical record widths and
 * de-optimize every downstream `data[field]` read (grid rendering, sorting, filtering, and cube
 * aggregation).
 *
 * Objects created via an object literal, by contrast, remain in fast mode with a hidden class
 * shared across all instances of the same shape - up to a V8 limit of 128 literal properties,
 * beyond which each instance receives its own hidden class and the sharing benefit is lost.
 *
 * This factory exploits that behavior by compiling (once per Store) a function that builds the
 * complete `data` object as a single literal, with one slot per Field. Default values are filled
 * in explicitly, so the returned objects carry an own property for every Field - unlike the
 * legacy sparse representation, which holds defaults on a shared prototype.
 *
 * The factory is only available when:
 * - The store defines no more than {@link MAX_FACTORY_FIELDS} fields. Above the (conservative)
 *   cutoff, hidden-class sharing degrades and the legacy sparse-prototype representation - which
 *   costs nothing per record for unpopulated fields - is the better strategy for the wide/sparse
 *   stores that typically have such field counts.
 * - The environment permits runtime code generation via `new Function` (blocked by a strict
 *   Content-Security-Policy without 'unsafe-eval').
 *
 * Note the property-count thresholds above are V8 implementation details (see
 * `fast_properties_soft_limit` / `max_fast_properties` in v8's flag-definitions.h), not contracted
 * API - hence the conservative margin and the runnable probe referenced in the GitHub issue below.
 *
 * See https://github.com/xh/hoist-react/issues/4500 for measurements and background.
 *
 * @internal
 */
export class RecordDataFactory {
    /**
     * Maximum number of store Fields for which a factory will be created. Chosen to remain
     * comfortably below V8's observed 128-literal-property limit on cross-instance hidden class
     * sharing, with margin for the record `id` and for future shifts in these V8 internals.
     */
    static MAX_FACTORY_FIELDS = 100;

    /**
     * Kill switch for testing/troubleshooting only - set false to have all newly-created Stores
     * fall back to the legacy sparse-prototype representation, as used for wide/CSP-restricted
     * stores.
     *
     * @internal
     */
    static enabled = true;

    /** Fields for this factory, in slot order. */
    readonly fields: Field[];

    /** Map of field name to its index within the `values` array taken by {@link create}. */
    readonly fieldIndices: Map<string, number>;

    private readonly defaults: any[];
    private readonly createFn: (values: any[]) => PlainObject;

    /**
     * Create a factory for the given fields, or return null if unsupported - too many fields,
     * field names unsafe for codegen, or runtime code generation unavailable (strict CSP).
     */
    static create(fields: Field[]): RecordDataFactory {
        if (
            !RecordDataFactory.enabled ||
            fields.length > RecordDataFactory.MAX_FACTORY_FIELDS ||
            fields.some(f => f.name === '__proto__') ||
            !isCodegenSupported()
        ) {
            return null;
        }
        return new RecordDataFactory(fields);
    }

    /** Array of per-field default values, in slot order - clone to seed a values array. */
    cloneDefaults(): any[] {
        return this.defaults.slice();
    }

    /**
     * Construct a new data object from an array of field values (in slot order, as per
     * {@link fieldIndices}). Every field is installed as an own property of the returned object.
     */
    create(values: any[]): PlainObject {
        return this.createFn(values);
    }

    private constructor(fields: Field[]) {
        this.fields = fields;
        this.fieldIndices = new Map(fields.map((f, idx) => [f.name, idx]));
        this.defaults = fields.map(f => f.defaultValue);

        // JSON.stringify field names to safely handle any quoting/escaping needs. String-literal
        // keys produce the same hidden-class shape as identifier keys.
        const body =
            'return {' +
            fields.map(({name}, idx) => `${JSON.stringify(name)}:v[${idx}]`).join(',') +
            '};';
        this.createFn = new Function('v', body) as (values: any[]) => PlainObject;
    }
}

//------------------------
// Implementation
//------------------------
let codegenSupported: boolean = null;

function isCodegenSupported(): boolean {
    if (codegenSupported === null) {
        try {
            new Function('return true;')();
            codegenSupported = true;
        } catch (e) {
            codegenSupported = false;
        }
    }
    return codegenSupported;
}
