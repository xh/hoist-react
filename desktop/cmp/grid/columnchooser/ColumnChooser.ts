/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {GridModel} from '@xh/hoist/cmp/grid';
import {grid} from '@xh/hoist/cmp/grid';
import {filler, hbox, vbox} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, HoistProps, LayoutProps, useLocalModel} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {gridFindField} from '@xh/hoist/desktop/cmp/grid';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {splitLayoutProps} from '@xh/hoist/utils/react';

import {ColumnChooserModel} from './ColumnChooserModel';
import {ColumnChooserBucketModel} from './impl/ColumnChooserBucketModel';
import './ColumnChooser.scss';

export interface ColumnChooserProps extends HoistProps, LayoutProps {
    /** GridModel whose columns this chooser manages. Falls back to context lookup. */
    gridModel?: GridModel;

    /** True (default) to show the Restore Defaults button. */
    showRestoreDefaults?: boolean;

    /**
     * True to show the Column Library - a left-docked panel listing hidden columns (grouped by
     * `chooserGroup`) that can be dragged onto the bucket grids to show them, and onto which bucket
     * columns can be dragged to hide them. When enabled, hidden columns are removed from the bucket
     * grids by default (toggle via the "Show Hidden" control). Default false.
     */
    showColumnLibrary?: boolean;
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

    render({className, showRestoreDefaults, showColumnLibrary, ...props}) {
        const impl = useLocalModel(ColumnChooserModel),
            [layoutProps] = splitLayoutProps(props);

        return hbox({
            className,
            ...layoutProps,
            items: [
                columnLibraryPanel({
                    impl,
                    omit: !impl.columnLibraryEnabled || !impl.showLibrary
                }),
                vbox({
                    flex: 1,
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
                            className:
                                'xh-column-chooser__bucket xh-column-chooser__bucket--unpinned',
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
                                button({
                                    omit: !impl.columnLibraryEnabled,
                                    icon: impl.showHidden
                                        ? Icon.checkSquare({intent: 'primary'})
                                        : Icon.square(),
                                    text: 'Show Hidden',
                                    onClick: () => (impl.showHidden = !impl.showHidden)
                                }),
                                button({
                                    omit: !impl.columnLibraryEnabled,
                                    icon: impl.showLibrary
                                        ? Icon.checkSquare({intent: 'primary'})
                                        : Icon.square(),
                                    text: 'Column Library',
                                    onClick: () => (impl.showLibrary = !impl.showLibrary)
                                }),
                                filler(),
                                button({
                                    omit: showRestoreDefaults === false,
                                    intent: 'danger',
                                    icon: Icon.reset(),
                                    text: 'Restore Defaults',
                                    onClick: () => impl.restoreDefaultsAsync()
                                })
                            ]
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

interface ColumnLibraryPanelProps extends HoistProps {
    impl: ColumnChooserModel;
}

const columnLibraryPanel = hoistCmp.factory<ColumnLibraryPanelProps>(({impl}) =>
    panel({
        className: 'xh-column-chooser__library',
        modelConfig: {
            side: 'left',
            defaultSize: 250,
            minSize: 150,
            collapsible: true
        },
        tbar: toolbar(
            storeFilterField({
                flex: 1,
                gridModel: impl.libraryModel.chooserGridModel,
                includeFields: ['name', 'description', 'chooserGroup'],
                placeholder: 'Filter Columns...'
            })
        ),
        item: grid({
            className: 'xh-column-chooser__bucket xh-column-chooser__library-grid',
            model: impl.libraryModel.chooserGridModel,
            agOptions: impl.libraryModel.agOptions
        })
    })
);
