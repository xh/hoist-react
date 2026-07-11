/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {filler, hframe, vbox} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, HoistProps, LayoutProps, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {gridFindField} from '@xh/hoist/desktop/cmp/grid';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {splitLayoutProps} from '@xh/hoist/utils/react';

import {ColChooserModel} from './ColChooserModel';
import './ColumnChooser.scss';
import {ColumnChooserBucketModel} from './ColumnChooserBucketModel';

export interface ColumnChooserProps extends HoistProps<ColChooserModel>, LayoutProps {}

/**
 * A component for managing Grid column visibility, ordering, and pinning. Renders three internal
 * grids - pinned-left, unpinned, and pinned-right - with drag-and-drop supported both within and
 * across grids. Bound to a {@link ColChooserModel}, which is owned by the grid and shared across
 * the chooser's dialog, popover, and panel presentations.
 */
export const [ColumnChooser, columnChooser] = hoistCmp.withFactory<ColumnChooserProps>({
    displayName: 'ColumnChooser',
    className: 'xh-column-chooser',
    model: uses(ColChooserModel),

    render({model, className, ...props}) {
        const [layoutProps] = splitLayoutProps(props),
            {showRestoreDefaults, commitOnChange, filterMatchMode} = model;

        return hframe({
            className,
            ...layoutProps,
            items: [
                columnLibraryPanel({
                    chooserModel: model,
                    omit: !model.isLibraryShown
                }),
                vbox({
                    flex: 1,
                    items: [
                        toolbar({
                            className: 'xh-column-chooser__tbar',
                            items: [
                                gridFindField({
                                    flex: 1,
                                    gridModel: model.unpinnedBucketModel.chooserGridModel,
                                    matchMode: filterMatchMode,
                                    placeholder: 'Find Columns'
                                })
                            ]
                        }),
                        pinnedBucketGrid({
                            bucket: model.leftBucketModel,
                            side: 'left',
                            omit: !model.columnPinningEnabled
                        }),
                        grid({
                            className:
                                'xh-column-chooser__bucket xh-column-chooser__bucket--unpinned',
                            model: model.unpinnedBucketModel.chooserGridModel,
                            agOptions: model.unpinnedBucketModel.agOptions
                        }),
                        pinnedBucketGrid({
                            bucket: model.rightBucketModel,
                            side: 'right',
                            omit: !model.columnPinningEnabled
                        }),
                        toolbar({
                            items: [
                                button({
                                    omit: !model.hasColumnGroups,
                                    icon: model.showGroups
                                        ? Icon.checkSquare({intent: 'primary'})
                                        : Icon.square(),
                                    text: 'Show Groups',
                                    onClick: () => (model.showGroups = !model.showGroups)
                                }),
                                button({
                                    omit: !model.columnLibraryEnabled,
                                    icon: model.showHidden
                                        ? Icon.checkSquare({intent: 'primary'})
                                        : Icon.square(),
                                    text: 'Show Hidden',
                                    onClick: () => (model.showHidden = !model.showHidden)
                                }),
                                button({
                                    omit: !model.columnLibraryEnabled,
                                    icon: model.showLibrary
                                        ? Icon.checkSquare({intent: 'primary'})
                                        : Icon.square(),
                                    text: 'Column Library',
                                    onClick: () => (model.showLibrary = !model.showLibrary)
                                }),
                                filler(),
                                button({
                                    omit: !showRestoreDefaults,
                                    intent: 'danger',
                                    icon: Icon.reset(),
                                    text: 'Restore Defaults',
                                    onClick: () => model.restoreDefaultsAsync()
                                }),
                                toolbarSep({
                                    omit: commitOnChange || !showRestoreDefaults
                                }),
                                button({
                                    omit: commitOnChange,
                                    text: 'Cancel',
                                    onClick: () => model.close()
                                }),
                                button({
                                    omit: commitOnChange,
                                    text: 'Save',
                                    icon: Icon.check(),
                                    intent: 'success',
                                    disabled: !model.isDirty,
                                    onClick: () => {
                                        model.commitPendingAsync();
                                        model.close();
                                    }
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
    chooserModel: ColChooserModel;
}

const columnLibraryPanel = hoistCmp.factory<ColumnLibraryPanelProps>(({chooserModel}) =>
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
                gridModel: chooserModel.libraryModel.chooserGridModel,
                includeFields: ['name', 'description', 'chooserGroup'],
                matchMode: chooserModel.filterMatchMode,
                placeholder: 'Filter Columns...'
            })
        ),
        item: grid({
            className: 'xh-column-chooser__bucket xh-column-chooser__library-grid',
            model: chooserModel.libraryModel.chooserGridModel,
            agOptions: chooserModel.libraryModel.agOptions
        })
    })
);
