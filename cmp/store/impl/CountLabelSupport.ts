/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Store} from '@xh/hoist/data';
import {apiDeprecated, NameSource} from '@xh/hoist/utils/js';
import {isNil} from 'lodash';

/**
 * Specifies which records a count label (e.g. {@link GridCountLabel}, {@link StoreCountLabel})
 * should include in its count:
 *  - `roots` (default): top-level records only.
 *  - `all`: all records, including nested children.
 *  - `leaves`: only records without children (i.e. excluding parents) - useful for tree grids.
 */
export type CountMode = 'roots' | 'all' | 'leaves';

/**
 * Resolve the record count for a count-label component, honoring the deprecated `includeChildren`
 * boolean when `includeMode` is not specified.
 * @internal
 */
export function resolveCountLabelValue(
    store: Store,
    includeMode: CountMode,
    includeChildren: boolean,
    source: NameSource
): number {
    if (!isNil(includeChildren)) {
        apiDeprecated('includeChildren', {
            v: 'v88',
            msg: "Use 'includeMode' instead ('all' for true, 'roots' for false).",
            source
        });
        includeMode = includeMode ?? (includeChildren ? 'all' : 'roots');
    }

    switch (includeMode ?? 'roots') {
        case 'all':
            return store.count;
        case 'leaves':
            return store.leafCount;
        default:
            return store.rootCount;
    }
}
