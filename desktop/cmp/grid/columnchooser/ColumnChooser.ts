/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {GridModel} from '@xh/hoist/cmp/grid';
import {grid} from '@xh/hoist/cmp/grid';
import {filler, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, LayoutProps, useLocalModel} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {gridFindField} from '@xh/hoist/desktop/cmp/grid';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {splitLayoutProps} from '@xh/hoist/utils/react';

import {ColumnChooserBucketModel} from './ColumnChooserBucketModel';
import {ColumnChooserModel} from './ColumnChooserModel';
import './ColumnChooser.scss';

export interface ColumnChooserProps extends HoistProps, LayoutProps {
    /** GridModel whose columns this chooser manages. Falls back to context lookup. */
    gridModel?: GridModel;
}

/**
 * A standalone component for managing Grid column visibility, ordering, and pinning.
 * Renders three internal grids - pinned-left, unpinned, and pinned-right - with drag-and-drop
 * supported both within and across grids. Bind to a GridModel via the `gridModel` prop or
 * context lookup.
 */
export const [ColumnChooser, columnChooser] = hoistCmp.withFactory<ColumnChooserProps>({
    displayName: 'ColumnChooser',
    className: 'xh-column-chooser',

    render({className, ...props}) {
        const impl = useLocalModel(ColumnChooserModel),
            [layoutProps] = splitLayoutProps(props);

        return vbox({
            className,
            ...layoutProps,
            items: [
                toolbar({
                    className: 'xh-column-chooser__tbar',
                    items: [
                        gridFindField({
                            flex: 1,
                            gridModel: impl.unpinnedBucketModel.chooserGridModel,
                            placeholder: 'Find Columns'
                        })
                    ]
                }),
                pinnedBucketGrid({
                    bucket: impl.leftBucketModel,
                    side: 'left',
                    omit: !impl.columnPinningEnabled
                }),
                grid({
                    className: 'xh-column-chooser__bucket xh-column-chooser__bucket--unpinned',
                    model: impl.unpinnedBucketModel.chooserGridModel,
                    agOptions: impl.unpinnedBucketModel.agOptions
                }),
                pinnedBucketGrid({
                    bucket: impl.rightBucketModel,
                    side: 'right',
                    omit: !impl.columnPinningEnabled
                }),
                toolbar({
                    items: [
                        button({
                            omit: !impl.hasColumnGroups,
                            icon: impl.showGroups
                                ? Icon.checkSquare({intent: 'primary'})
                                : Icon.square(),
                            text: 'Show Groups',
                            onClick: () => (impl.showGroups = !impl.showGroups)
                        }),
                        filler(),
                        button({
                            intent: 'danger',
                            icon: Icon.reset(),
                            text: 'Restore Defaults',
                            onClick: () => impl.restoreDefaultsAsync()
                        })
                    ]
                })
            ]
        });
    }
});

interface BucketGridProps extends HoistProps {
    bucket: ColumnChooserBucketModel;
    side: 'left' | 'right';
}

const pinnedBucketGrid = hoistCmp.factory<BucketGridProps>(({bucket, side}) =>
    panel({
        className: 'xh-column-chooser__bucket-panel',
        modelConfig: {
            side: side === 'left' ? 'top' : 'bottom',
            defaultSize: 80,
            minSize: 80,
            collapsible: false
        },
        item: grid({
            className: `xh-column-chooser__bucket xh-column-chooser__bucket--${side}`,
            model: bucket.chooserGridModel,
            agOptions: bucket.agOptions,
            flex: null
        })
    })
);
