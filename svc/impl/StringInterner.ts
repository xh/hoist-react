/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {isArray, isPlainObject, isString} from 'lodash';
import type {InternStringsSpec} from '../FetchService';

/**
 * Generational string-interning cache for a logical dataset, identified by an app-provided
 * key and shared across fetches of that dataset - see {@link FetchOptions.internStrings}.
 *
 * Values are deduplicated into an internal pending map spanning a whole response (all chunks
 * of an NDJSON stream), with lookups falling back to the previous committed generation, so
 * values repeated across successive fetches share a single canonical string. Calling `commit()`
 * installs the pending values as the new generation, bounding cache retention to the strings
 * present in the latest completed response.
 *
 * The pending map is opened lazily by `intern()`. A response that fails or is abandoned before
 * commit should be `abort()`ed to discard its pending values - the previously committed
 * generation remains in place either way.
 *
 * @internal
 */
export class StringInterner {
    readonly spec: InternStringsSpec;

    private readonly childrenKey: string;
    private committed: Map<string, string> = new Map();
    private pending: Map<string, string> = null;

    constructor(spec: InternStringsSpec) {
        this.spec = spec;
        this.childrenKey = spec.childrenKey;
    }

    /**
     * Intern string values within the given data, in place. Returns the same value.
     *
     * Accepts an array of records, or a single plain-object record - the latter treated as a
     * root node, with its own string values interned and `childrenKey` recursion applying as
     * usual. Any other value passes through untouched.
     */
    intern<T>(data: T): T {
        this.pending ??= new Map();
        const rows = isArray(data) ? data : [data];
        rows.forEach(row => {
            if (isPlainObject(row)) this.internRow(row);
        });
        return data;
    }

    /** Install pending values as the new committed generation, evicting values not re-seen. */
    commit() {
        if (this.pending) {
            this.committed = this.pending;
            this.pending = null;
        }
    }

    /** Discard pending values without committing. No-op if already committed or aborted. */
    abort() {
        this.pending = null;
    }

    //------------------
    // Implementation
    //------------------
    private internRow(row: PlainObject) {
        const {pending, committed, childrenKey} = this;
        for (const k in row) {
            const v = row[k];
            if (isString(v)) {
                let c = pending.get(v);
                if (c === undefined) {
                    c = committed.get(v) ?? v;
                    pending.set(c, c);
                }
                row[k] = c;
            } else if (k === childrenKey) {
                this.intern(v);
            }
        }
    }
}
