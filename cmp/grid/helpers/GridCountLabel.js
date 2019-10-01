/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {GridModel} from '@xh/hoist/cmp/grid';
import {box} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {fmtNumber} from '@xh/hoist/format';
import {pluralize, singularize, withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';

/**
 * Displays the number of records loaded into a grid's store + (configurable) selection count.
 *
 * Alternative to more general {@see StoreCountLabel}.
 */
export const [GridCountLabel, gridCountLabel] = hoistCmp.withFactory({
    displayName: 'GridCountLabel',
    className: 'xh-grid-count-label',

    render({
        gridModel,
        includeChildren = false,
        showSelectionCount = 'auto',
        unit = 'record',
        ...props
    }) {

        gridModel = withDefault(gridModel, useContextModel(GridModel));

        if (!gridModel) {
            console.error("No GridModel available to GridCountLabel.  Provide via a 'gridModel' prop, or context.");
            return '';
        }

        const {store, selection} = gridModel;

        const fmtCount = (count) => fmtNumber(count, {precision: 0}),
            recCountString = () => {
                const count = includeChildren ? store.count : store.rootCount,
                    unitLabel = count === 1 ? singularize(unit) : pluralize(unit);

                return `${fmtCount(count)} ${unitLabel}`;
            },
            selCountString = () => {
                const count = selection.length,
                    countStr = count ? fmtCount(count) : 'none',
                    showCount = showSelectionCount == 'always' || (showSelectionCount == 'auto' && count > 1);

                return showCount ? ` (${countStr} selected)` : '';
            };

        return box({
            ...props,
            item: `${recCountString()} ${selCountString()}`
        });
    }
});
GridCountLabel.propTypes = {

    /** GridModel to which this component should bind. */
    gridModel: PT.instanceOf(GridModel),

    /**
     * True to count nested child records.
     * If false (default) only root records will be included in count.
     */
    includeChildren: PT.bool,

    /**
     * Control display of selection count after overall records count: auto (default) to display
     * count when > 1, or always/never to show/hide regardless of current count.
     */
    showSelectionCount: PT.oneOf(['always', 'never', 'auto']),

    /** Units label appropriate for records being counted (e.g. "user" -> "50 users"). */
    unit: PT.string
};