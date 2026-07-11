/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {div, filler, hframe, vbox, vframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, HoistProps, LayoutProps, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {gridFindField} from '@xh/hoist/desktop/cmp/grid';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
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
            {commitOnChange, filterMatchMode} = model;

        return vframe({
            className,
            ...layoutProps,
            items: [
                hframe({
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
                                        }),
                                        viewMenu({chooserModel: model})
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
                                })
                            ]
                        })
                    ]
                }),
                toolbar({
                    // Footer carries only the primary Save/Cancel actions - view toggles and
                    // Restore Defaults live in the header "View" menu. Empty when auto-committing.
                    omit: commitOnChange,
                    items: [
                        button({
                            omit: !model.showRestoreDefaults,
                            intent: 'danger',
                            icon: Icon.reset(),
                            text: 'Restore Defaults',
                            onClick: () => model.restoreDefaultsAsync()
                        }),
                        filler(),
                        button({
                            text: 'Cancel',
                            onClick: () => model.close()
                        }),
                        button({
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
        });
    }
});

interface ViewMenuProps extends HoistProps {
    chooserModel: ColChooserModel;
}

/**
 * Header "View" popover consolidating the chooser's display toggles (group tree, column library,
 * show-hidden-inline) with the destructive Restore Defaults action, kept visually separate below a
 * divider. Omitted entirely when none of its items apply.
 */
const viewMenu = hoistCmp.factory<ViewMenuProps>(({chooserModel}) => {
    const {hasColumnGroups, columnLibraryEnabled, showRestoreDefaults} = chooserModel,
        hasToggles = hasColumnGroups || columnLibraryEnabled;

    if (!hasToggles && !showRestoreDefaults) return null;

    return popover({
        position: 'bottom-right',
        minimal: true,
        item: button({
            icon: Icon.ellipsisVertical()
        }),
        content: menu({
            items: [
                menuDivider({title: 'Display', omit: !hasToggles}),
                viewToggle({
                    omit: !hasColumnGroups,
                    checked: chooserModel.showGroups,
                    label: 'Group columns',
                    help: "Show the grid's group hierarchy as a tree",
                    onToggle: () => (chooserModel.showGroups = !chooserModel.showGroups)
                }),
                viewToggle({
                    omit: !columnLibraryEnabled,
                    checked: chooserModel.showLibrary,
                    label: 'Column library',
                    help: 'Side panel of hidden columns to drag in',
                    onToggle: () => (chooserModel.showLibrary = !chooserModel.showLibrary)
                }),
                viewToggle({
                    omit: !columnLibraryEnabled,
                    checked: chooserModel.showHidden,
                    label: 'Show hidden inline',
                    help: 'List hidden columns in place, dimmed',
                    onToggle: () => (chooserModel.showHidden = !chooserModel.showHidden)
                }),
                menuDivider({omit: !hasToggles || !showRestoreDefaults}),
                menuItem({
                    omit: !showRestoreDefaults,
                    intent: 'danger',
                    icon: Icon.reset(),
                    text: 'Restore Defaults',
                    onClick: () => chooserModel.restoreDefaultsAsync()
                })
            ]
        })
    });
});

interface ViewToggleProps extends HoistProps {
    checked: boolean;
    label: string;
    help: string;
    onToggle: () => void;
}

const viewToggle = hoistCmp.factory<ViewToggleProps>(({checked, label, help, onToggle}) =>
    menuItem({
        // Keep the menu open so multiple toggles can be flipped in a single visit.
        shouldDismissPopover: false,
        icon: checked ? Icon.checkSquare({intent: 'primary'}) : Icon.square(),
        onClick: onToggle,
        text: div({
            className: 'xh-column-chooser__view-item',
            items: [div(label), div({className: 'xh-column-chooser__view-item__help', item: help})]
        })
    })
);

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
