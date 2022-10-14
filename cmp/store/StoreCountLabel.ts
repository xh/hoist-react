/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {box} from '@xh/hoist/cmp/layout';
import {BoxProps, hoistCmp} from '@xh/hoist/core';
import {Store} from '@xh/hoist/data';
import {fmtNumber} from '@xh/hoist/format';
import {pluralize, singularize} from '@xh/hoist/utils/js';

/**
 * Displays the number of (post-filtered) records loaded into a Store.
 *
 * Using with a Grid? {@see GridCountLabel} for an alternative that also displays selection count.
 */
export const [StoreCountLabel, storeCountLabel] = hoistCmp.withFactory<StoreCountLabelProps>({

    className: 'xh-store-count-label',

    render({
        store,
        unit = 'record',
        includeChildren = false,
        ...props
    }, ref) {
        const count = includeChildren ? store.count : store.rootCount,
            unitLabel = count === 1 ? singularize(unit) : pluralize(unit),
            item = `${fmtNumber(count, {precision: 0, asHtml: true})} ${unitLabel}`;

        return box({...props, ref, item});
    }
});

export interface StoreCountLabelProps extends BoxProps {

    /** Store to which this component should bind. */
    store?: Store;

    /**
     * True to count nested child records.
     * If false (default) only root records will be included in count.
     */
    includeChildren?: boolean;

    /** Units label appropriate for records being counted (e.g. "user" -> "50 users"). */
    unit?: string;
}