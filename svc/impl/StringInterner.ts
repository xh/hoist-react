/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {isArray, isPlainObject, isString, round} from 'lodash';
import type {StringInternSpec} from '../FetchService';

/**
 * Generational string-interning cache for a logical dataset, identified by an app-provided
 * key and shared across fetches of that dataset - see {@link FetchOptions.internStrings}.
 *
 * Values are deduplicated into an internal pending map spanning a whole response (all chunks
 * of an NDJSON stream), with lookups falling back to the previously committed values, so values
 * repeated across successive fetches share a single canonical string. Calling `commit()`
 * installs the pending values per the spec's `retainMode` - by default replacing the committed
 * set, bounding cache retention to the strings present in the latest completed response. See
 * {@link StringInternSpec.retainMode} for the 'always' and 'never' variants.
 *
 * The pending map is opened lazily by `intern()`. A response that fails or is abandoned before
 * commit should be `abort()`ed to discard its pending values - the previously committed
 * generation remains in place either way.
 *
 * @internal
 */
export class StringInterner {
    /** Latest spec provided for this key - adopted on each call, so settings may vary. */
    spec: StringInternSpec;

    private committed: Map<string, string> = new Map();
    private pending: Map<string, string> = null;

    // Live counters for the in-progress cycle, snapshotted to lastStats on commit.
    private processed = 0;
    private carried = 0;
    private lastStats: PlainObject = null;

    constructor(spec: StringInternSpec) {
        this.spec = spec;
    }

    /**
     * Stats for the most recently committed cycle (i.e. response) - all zero if none committed:
     *  - `processed` - total string values encountered.
     *  - `retained` - distinct values in the committed response, with `retainedPct` of
     *     processed. Lower percentage = more duplication removed.
     *  - `carried` - retained values already present in the previous generation, with
     *    `carriedPct` of retained. Higher percentage = more stability across refreshes.
     *
     * Introspect from the console via `XH.fetchService.getInternStats()`.
     */
    get stats(): PlainObject {
        const {processed = 0, retained = 0, carried = 0} = this.lastStats ?? {};
        return {
            key: this.spec.key,
            processed,
            retained,
            retainedPct: processed ? round((100 * retained) / processed, 1) : 0,
            carried,
            carriedPct: retained ? round((100 * carried) / retained, 1) : 0
        };
    }

    /**
     * Intern string values within the given data, mutating it in place.
     *
     * Accepts an array of records, or a single plain-object record - the latter treated as a
     * root node, with its own string values interned and `childrenKey` recursion applying as
     * usual. Values of any other shape are ignored.
     */
    intern(data: PlainObject | PlainObject[]) {
        this.pending ??= new Map();
        const rows = isArray(data) ? data : [data];
        rows.forEach(row => {
            if (isPlainObject(row)) this.internRow(row);
        });
    }

    /**
     * Install pending values for reuse by later responses, per the spec's `retainMode`:
     * 'nextCall' (default) replaces the committed set, evicting values not re-seen; 'always'
     * merges into it; 'never' discards, leaving `committed` permanently empty so interning is
     * per-response only.
     */
    commit() {
        const {pending, committed} = this;
        if (!pending) return;

        switch (this.spec.retainMode ?? 'nextCall') {
            case 'nextCall':
                this.committed = pending;
                break;
            case 'always':
                pending.forEach(v => committed.set(v, v));
                break;
        }

        this.lastStats = {
            processed: this.processed,
            retained: pending.size,
            carried: this.carried
        };
        this.pending = null;
        this.processed = this.carried = 0;
    }

    /** Discard pending values without committing. No-op if already committed or aborted. */
    abort() {
        this.pending = null;
        this.processed = this.carried = 0;
    }

    //------------------
    // Implementation
    //------------------
    private internRow(row: PlainObject) {
        const {pending, committed} = this,
            {childrenKey} = this.spec;
        for (const k in row) {
            const v = row[k];
            if (isString(v)) {
                this.processed++;
                let c = pending.get(v);
                if (c === undefined) {
                    c = committed.get(v);
                    if (c !== undefined) {
                        this.carried++;
                    } else {
                        c = v;
                    }
                    pending.set(c, c);
                }
                row[k] = c;
            } else if (k === childrenKey) {
                this.intern(v);
            }
        }
    }
}
