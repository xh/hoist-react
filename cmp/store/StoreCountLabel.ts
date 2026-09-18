/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {box} from '@xh/hoist/cmp/layout';
import {BoxProps, hoistCmp, HoistProps} from '@xh/hoist/core';
import {Store} from '@xh/hoist/data';
import {fmtNumber} from '@xh/hoist/format';
import {pluralize, singularize} from '@xh/hoist/utils/js';
import {CountMode, resolveCountLabelValue} from './impl/CountLabelSupport';

export interface StoreCountLabelProps extends HoistProps, BoxProps {
    /** Store to which this component should bind. */
    store: Store;

    /** Which records to count: 'roots' (default), 'all', or 'leaves' (exclude parents). */
    includeMode?: CountMode;

    /**
     * True to count nested child records.
     * If false (default) only root records will be included in count.
     * @deprecated use `includeMode` instead ('all' for true, 'roots' for false).
     */
    includeChildren?: boolean;

    /** Units label appropriate for records being counted (e.g. "user" yields "50 users"). */
    unit?: string;
}

/**
 * Displays the number of (post-filtered) records loaded into a Store.
 */
export const [StoreCountLabel, storeCountLabel] = hoistCmp.withFactory<StoreCountLabelProps>({
    className: 'xh-store-count-label',

    render({store, unit = 'record', includeMode, includeChildren, ...props}, ref) {
        const count = resolveCountLabelValue(store, includeMode, includeChildren, StoreCountLabel),
            unitLabel = count === 1 ? singularize(unit) : pluralize(unit),
            item = `${fmtNumber(count, {precision: 0, asHtml: true})} ${unitLabel}`;

        return box({...props, ref, item});
    }
});
