/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {box} from '@xh/hoist/cmp/layout';
import {BoxProps, hoistCmp, HoistPropsWithRef, useContextModel} from '@xh/hoist/core';
import {fmtNumber} from '@xh/hoist/format';
import {logError, pluralize, singularize, withDefault} from '@xh/hoist/utils/js';
import {GridModel} from '../GridModel';

export interface GridCountLabelProps extends HoistPropsWithRef<HTMLDivElement>, BoxProps {
    /** GridModel to which this component should bind. */
    gridModel?: GridModel;

    /**
     * True to count nested child records.
     * If false (default) only root records will be included in count.
     */
    includeChildren?: boolean;

    /**
     * Control display of selection count after overall records count: auto (default) to display
     * count when greater than 1, or always/never to show/hide regardless of current count.
     */
    showSelectionCount?: 'always' | 'never' | 'auto';

    /** Units label appropriate for records being counted (e.g. "user" will yield, e.g. "50 users"). */
    unit?: string;
}

/**
 * Displays the number of records loaded into a grid's store + (configurable) selection count.
 *
 * Alternative to more general {@link StoreCountLabel}.
 */
export const [GridCountLabel, gridCountLabel] = hoistCmp.withFactory<GridCountLabelProps>({
    displayName: 'GridCountLabel',
    className: 'xh-grid-count-label',

    render(
        {
            gridModel,
            includeChildren = false,
            showSelectionCount = 'auto',
            unit = 'record',
            ...props
        },
        ref
    ) {
        gridModel = withDefault(gridModel, useContextModel(GridModel));

        if (!gridModel) {
            logError(
                `GridModel not found - provide via 'gridModel' prop or context.`,
                GridCountLabel
            );
            return '';
        }

        const {store, selectedRecords} = gridModel;

        const fmtCount = count => fmtNumber(count, {precision: 0, asHtml: true}),
            recCountString = () => {
                const count = includeChildren ? store.count : store.rootCount,
                    unitLabel = count === 1 ? singularize(unit) : pluralize(unit);

                return `${fmtCount(count)} ${unitLabel}`;
            },
            selCountString = () => {
                const count = selectedRecords.length,
                    countStr = count ? fmtCount(count) : 'none',
                    showCount =
                        showSelectionCount === 'always' ||
                        (showSelectionCount === 'auto' && count > 1);

                return showCount ? ` (${countStr} selected)` : '';
            };

        return box({
            ...props,
            item: `${recCountString()} ${selCountString()}`,
            ref
        });
    }
});
