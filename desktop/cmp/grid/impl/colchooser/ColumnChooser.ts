/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {div, filler, hframe, span, vbox, vframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, HoistProps, LayoutProps, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {gridFindField} from '@xh/hoist/desktop/cmp/grid';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';

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
            {commitOnChange, filterMatchMode, columnPinningEnabled} = model,
            {leftBucketModel, unpinnedBucketModel, rightBucketModel} = model,
            leftHasCols = columnPinningEnabled && leftBucketModel.columnCount > 0,
            rightHasCols = columnPinningEnabled && rightBucketModel.columnCount > 0,
            // The free-floating "Columns" zone only needs a label when a populated pinned zone sits
            // beside it - with both pinned rails empty there are no adjacent zones to tell it apart.
            showColumnsLabel = leftHasCols || rightHasCols;

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
                                            gridModel: unpinnedBucketModel.chooserGridModel,
                                            matchMode: filterMatchMode,
                                            placeholder: 'Find Columns'
                                        }),
                                        viewMenu({chooserModel: model})
                                    ]
                                }),
                                bucketSeparator({
                                    chooserModel: model,
                                    bucket: leftBucketModel,
                                    variant: 'left',
                                    omit: !leftHasCols
                                }),
                                bucketGrid({
                                    bucketModel: leftBucketModel,
                                    bucket: 'left',
                                    omit: !columnPinningEnabled
                                }),
                                bucketSeparator({
                                    chooserModel: model,
                                    bucket: unpinnedBucketModel,
                                    variant: 'unpinned',
                                    omit: !showColumnsLabel
                                }),
                                bucketGrid({
                                    bucketModel: unpinnedBucketModel,
                                    bucket: 'unpinned'
                                }),
                                bucketSeparator({
                                    chooserModel: model,
                                    bucket: rightBucketModel,
                                    variant: 'right',
                                    omit: !rightHasCols
                                }),
                                bucketGrid({
                                    bucketModel: rightBucketModel,
                                    bucket: 'right',
                                    omit: !columnPinningEnabled
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
 * Header "View" popover consolidating the chooser's display toggles (group tree, column library)
 * with the destructive Restore Defaults action, kept visually separate below a divider. Omitted
 * entirely when none of its items apply.
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
    bucketModel: ColumnChooserBucketModel;
    bucket: 'left' | 'right' | 'unpinned';
}

/**
 * A single chooser bucket grid. The pinned (left/right) rails auto-height to their content via
 * `domLayout: 'autoHeight'` - growing/shrinking as columns are pinned. When a pinned side holds no
 * columns the grid collapses to a minimal 1-line drop strip (its emptyText, keyed to the pin
 * direction). The unpinned "Columns" bucket flexes to fill remaining space and scrolls internally.
 */
const bucketGrid = hoistCmp.factory<BucketGridProps>(({bucketModel: bucket, bucket: variant}) => {
    const pinned = variant !== 'unpinned',
        empty = pinned && bucket.columnCount === 0;

    return grid({
        className: classNames(
            'xh-column-chooser__bucket',
            `xh-column-chooser__bucket--${variant}`,
            empty ? 'xh-column-chooser__bucket--empty' : null,
            empty && bucket.dragOver ? 'xh-column-chooser__bucket--drag-over' : null
        ),
        model: bucket.chooserGridModel,
        agOptions: pinned ? {...bucket.agOptions, domLayout: 'autoHeight'} : bucket.agOptions,
        // Pinned rails size to their (auto-height) grid content; the unpinned bucket flexes.
        flex: pinned ? null : 1
    });
});

interface BucketSeparatorProps extends HoistProps {
    chooserModel: ColChooserModel;
    bucket: ColumnChooserBucketModel;
    variant: 'left' | 'right' | 'unpinned';
}

/**
 * Zone divider - a lighter-weight label riding a hairline rule, deliberately distinct from a filled
 * column-group header bar so the eye reads "structural zone" not "group". Aligned to echo the zone's
 * position (left / center / right); pinned zones flank the label with a direction arrow. The bucket's
 * "toggle all visibility" control rides the far end (omitted when it has nothing to act on).
 */
const bucketSeparator = hoistCmp.factory<BucketSeparatorProps>(
    ({chooserModel, bucket, variant}) => {
        const arrow =
            variant === 'left'
                ? Icon.arrowToLeft({className: 'xh-column-chooser__separator__arrow'})
                : variant === 'right'
                  ? Icon.arrowToRight({className: 'xh-column-chooser__separator__arrow'})
                  : null;

        return div({
            className: classNames(
                'xh-column-chooser__separator',
                `xh-column-chooser__separator--${variant}`
            ),
            items: [
                div({className: 'xh-column-chooser__separator__line'}),
                span({
                    className: 'xh-column-chooser__separator__label',
                    // Arrow trails the label on the right rail, leads it on the left.
                    items: variant === 'right' ? [bucket.title, arrow] : [arrow, bucket.title]
                }),
                div({className: 'xh-column-chooser__separator__line'}),
                bucketVisibilityToggle({chooserModel, bucket})
            ]
        });
    }
);

interface BucketHeaderProps extends HoistProps {
    chooserModel: ColChooserModel;
    bucket: ColumnChooserBucketModel;
}

/**
 * Bucket-scoped "toggle all visibility" control riding the end of a zone separator. Reflects the
 * aggregate all/none/mixed state; omitted while the Column Library is shown (columns are hidden by
 * dragging to the library then) or when the bucket has no hideable columns.
 */
const bucketVisibilityToggle = hoistCmp.factory<BucketHeaderProps>(({chooserModel, bucket}) => {
    if (chooserModel.isLibraryShown || !bucket.hasHideableColumns) return null;

    const visible = bucket.aggregateVisible,
        icon =
            visible === null
                ? Icon.squareMinus()
                : visible
                  ? Icon.checkSquare({intent: 'primary'})
                  : Icon.square();

    return button({
        className: 'xh-column-chooser__separator__toggle',
        icon,
        minimal: true,
        onClick: () => bucket.toggleBucketVisibility()
    });
});

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
            collapsible: false,
            resizable: true
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
