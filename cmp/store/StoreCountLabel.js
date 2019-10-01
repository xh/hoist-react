/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {box} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {Store} from '@xh/hoist/data';
import {fmtNumber} from '@xh/hoist/format';
import {pluralize, singularize} from '@xh/hoist/utils/js';
import PT from 'prop-types';

/**
 * Displays the number of (post-filtered) records loaded into a Store.
 *
 * Using with a Grid? {@see GridCountLabel} for an alternative that also displays selection count.
 */
export const [StoreCountLabel, storeCountLabel] = hoistCmp.withFactory({

    className: 'xh-store-count-label',

    render({
        store,
        unit = 'record',
        includeChildren = false,
        ...props
    }) {
        const count = includeChildren ? store.count : store.rootCount,
            unitLabel = count === 1 ? singularize(unit) : pluralize(unit),
            item = `${fmtNumber(count, {precision: 0})} ${unitLabel}`;

        return box({...props, item});
    }
});

StoreCountLabel.propTypes = {

    /** Store to which this component should bind. */
    store: PT.instanceOf(Store),

    /**
     * True to count nested child records.
     * If false (default) only root records will be included in count.
     */
    includeChildren: PT.bool,

    /** Units label appropriate for records being counted (e.g. "user" -> "50 users"). */
    unit: PT.string
};