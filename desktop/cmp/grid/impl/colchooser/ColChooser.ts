/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {div, filler, fragment, hframe, span, vbox, vframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, HoistProps, LayoutProps, uses} from '@xh/hoist/core';
import type {FilterTestFn} from '@xh/hoist/data';
import {button} from '@xh/hoist/desktop/cmp/button';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon, IconProps} from '@xh/hoist/icon';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {ReactElement} from 'react';

import {ColChooserModel} from './ColChooserModel';
import './ColChooser.scss';
import {ColChooserBucketModel} from './ColChooserBucketModel';

export interface ColChooserProps extends HoistProps<ColChooserModel>, LayoutProps {}

/**
 * A component for managing Grid column visibility, ordering, and pinning. Renders three internal grids
 * - pinned-left, unpinned, pinned-right - with drag-and-drop within and across them. Bound to a
 * {@link ColChooserModel}, shared across the dialog, popover, and panel presentations.
 * @internal
 */
export const [ColChooser, colChooser] = hoistCmp.withFactory<ColChooserProps>({
    displayName: 'ColChooser',
    className: 'xh-col-chooser',
    model: uses(ColChooserModel),

    render({model, className, ...props}) {
        const [layoutProps] = splitLayoutProps(props);
        // Overlays hug their content, so the root fixes only height - width follows the buckets below.
        return vframe({
            className,
            height: model.sizeToContent ? model.height : null,
            ...layoutProps,
            items: [
                chooserTopBar({chooserModel: model}),
                chooserBody({chooserModel: model}),
                chooserFooter({chooserModel: model})
            ]
        });
    }
});

interface ChooserSectionProps extends HoistProps {
    chooserModel: ColChooserModel;
}

/**
 * Single toolbar spanning the library and the buckets, holding the shared filter control and the
 * minimal display-toggle / restore-defaults buttons.
 */
const chooserTopBar = hoistCmp.factory<ChooserSectionProps>(({chooserModel}) =>
    toolbar({
        className: 'xh-col-chooser__tbar',
        items: [
            storeFilterField({
                flex: 1,
                model: chooserModel,
                bind: 'filterText',
                store: chooserModel.filterFieldStore,
                autoApply: false,
                onFilterChange: (fn: FilterTestFn) => chooserModel.applyFilterTestFn(fn),
                // Only fields actually shown in the grids - matching the tooltip-only `description`
                // would surface rows on text the user can't see.
                includeFields: ['name', 'chooserGroup'],
                matchMode: chooserModel.filterMatchMode,
                placeholder: 'Filter columns...'
            }),
            toggleBtn({
                omit: !chooserModel.hasColumnGroups,
                model: chooserModel.optionsModel,
                bind: 'showGroups',
                icon: Icon.treeList,
                label: 'Column Groups'
            }),
            toggleBtn({
                omit: !chooserModel.columnLibraryEnabled,
                model: chooserModel.optionsModel,
                bind: 'showLibrary',
                icon: Icon.books,
                label: 'Column Library'
            }),
            button({
                omit: !chooserModel.showRestoreDefaults,
                minimal: true,
                intent: 'danger',
                icon: Icon.reset(),
                tooltip: 'Restore Defaults',
                onClick: () => chooserModel.restoreDefaultsAsync()
            }),
            button({
                omit: !chooserModel.showCloseButton,
                minimal: true,
                icon: Icon.close(),
                tooltip: 'Close',
                onClick: () => chooserModel.close()
            })
        ]
    })
);

/** Library panel (when shown) beside the stack of bucket zones. */
const chooserBody = hoistCmp.factory<ChooserSectionProps>(({chooserModel}) =>
    hframe(colLibraryPanel({chooserModel}), chooserBuckets({chooserModel}))
);

/**
 * The bucket zones in master order: pinned-left, the unpinned "Columns" divider + grid, pinned-right.
 * Each zone re-renders independently off its own bucket.
 */
const chooserBuckets = hoistCmp.factory<ChooserSectionProps>(({chooserModel}) =>
    vbox({
        flex: chooserModel.sizeToContent ? null : 1,
        width: chooserModel.sizeToContent ? chooserModel.width : null,
        items: [
            pinnedBucket({chooserModel, bucketModel: chooserModel.leftBucketModel, bucket: 'left'}),
            columnsSeparator({chooserModel}),
            bucketGrid({bucketModel: chooserModel.unpinnedBucketModel, bucket: 'unpinned'}),
            pinnedBucket({
                chooserModel,
                bucketModel: chooserModel.rightBucketModel,
                bucket: 'right'
            })
        ]
    })
);

interface PinnedBucketZoneProps extends ChooserSectionProps {
    bucketModel: ColChooserBucketModel;
    bucket: 'left' | 'right';
}

/**
 * A pinned rail: its zone separator above its grid, emitted as siblings so both stay direct flex
 * children of the stack. Collapses to a bare drop strip (no separator) when empty - filtered or
 * genuinely. With pinning disabled the rail shows only if the app pinned columns into it - there is no
 * drop strip to offer.
 */
const pinnedBucket = hoistCmp.factory<PinnedBucketZoneProps>(
    ({chooserModel, bucketModel, bucket}) => {
        if (!chooserModel.columnPinningEnabled && bucketModel.columnCount === 0) return null;
        return fragment(
            bucketSeparator({
                chooserModel,
                bucketModel,
                bucket,
                omit: bucketModel.columnCount === 0
            }),
            bucketGrid({bucketModel, bucket})
        );
    }
);

/**
 * The unpinned "Columns" zone divider, split out from the unpinned grid so its cross-bucket read
 * (does either pinned rail hold columns?) re-renders only this hairline, never the grid. Shown only
 * when a populated pinned zone sits beside it - with both rails empty there are no adjacent zones to
 * tell it apart.
 */
const columnsSeparator = hoistCmp.factory<ChooserSectionProps>(({chooserModel}) => {
    const {leftBucketModel, rightBucketModel} = chooserModel,
        show = leftBucketModel.columnCount > 0 || rightBucketModel.columnCount > 0;
    return show
        ? bucketSeparator({
              chooserModel,
              bucketModel: chooserModel.unpinnedBucketModel,
              bucket: 'unpinned'
          })
        : null;
});

/** Footer Save/Cancel actions. Absent when auto-committing. */
const chooserFooter = hoistCmp.factory<ChooserSectionProps>(({chooserModel}) => {
    if (chooserModel.commitOnChange) return null;
    return toolbar(
        filler(),
        button({
            text: 'Cancel',
            onClick: () => chooserModel.close()
        }),
        button({
            text: 'Save',
            icon: Icon.check(),
            intent: 'success',
            disabled: !chooserModel.isDirty,
            onClick: () => {
                chooserModel.commitPendingAsync();
                chooserModel.close();
            }
        })
    );
});

interface ToggleBtnProps extends HoistProps {
    bind: string;
    icon: (p?: IconProps) => ReactElement;
    label: string;
}

/**
 * Minimal icon-only display toggle riding the top bar - solid + primary intent when active, thin +
 * muted when not.
 */
const toggleBtn = hoistCmp.factory<ToggleBtnProps>(({model, bind, icon, label}) => {
    const active = model[bind];
    return button({
        className: 'xh-col-chooser__toggle',
        minimal: true,
        intent: active ? 'primary' : null,
        icon: icon({prefix: active ? 'far' : 'fat'}),
        tooltip: `${active ? 'Hide' : 'Show'} ${label}`,
        onClick: () => model.setBindable(bind, !active)
    });
});

interface BucketGridProps extends HoistProps {
    bucketModel: ColChooserBucketModel;
    bucket: 'left' | 'right' | 'unpinned';
}

/**
 * A single chooser bucket grid. Pinned rails auto-height to their content, collapsing to a 1-line drop
 * strip when empty; the unpinned bucket flexes to fill remaining space and scrolls internally.
 */
const bucketGrid = hoistCmp.factory<BucketGridProps>(({bucketModel, bucket}) => {
    const pinned = bucket !== 'unpinned',
        empty = pinned && bucketModel.columnCount === 0;

    return grid({
        className: classNames(
            'xh-col-chooser__bucket',
            `xh-col-chooser__bucket--${bucket}`,
            empty ? 'xh-col-chooser__bucket--empty' : null,
            empty && bucketModel.dragOver ? 'xh-col-chooser__bucket--drag-over' : null
        ),
        model: bucketModel.chooserGridModel,
        // The unpinned bucket permanently reserves its scrollbar gutter, holding the same right edge as
        // the pinned rails whether or not it overflows (SCSS suppresses the empty track when it doesn't).
        agOptions: pinned
            ? {...bucketModel.agOptions, domLayout: 'autoHeight'}
            : {...bucketModel.agOptions, alwaysShowVerticalScroll: true},
        flex: pinned ? null : 1
    });
});

interface BucketSeparatorProps extends HoistProps {
    chooserModel: ColChooserModel;
    bucketModel: ColChooserBucketModel;
    bucket: 'left' | 'right' | 'unpinned';
}

/**
 * Zone divider - a lighter-weight label riding a hairline rule, deliberately distinct from a filled
 * column-group header bar so the eye reads "structural zone" not "group". Aligned to echo the zone's
 * position, with the bucket's "toggle all visibility" control riding the far end.
 */
const bucketSeparator = hoistCmp.factory<BucketSeparatorProps>(
    ({chooserModel, bucketModel, bucket}) => {
        const arrow =
            bucket === 'left'
                ? Icon.arrowToLeft({className: 'xh-col-chooser__separator__arrow'})
                : bucket === 'right'
                  ? Icon.arrowToRight({className: 'xh-col-chooser__separator__arrow'})
                  : null;

        return div({
            className: classNames(
                'xh-col-chooser__separator',
                `xh-col-chooser__separator--${bucket}`
            ),
            items: [
                div({className: 'xh-col-chooser__separator__line'}),
                span({
                    className: 'xh-col-chooser__separator__label',
                    // Arrow trails the label on the right rail, leads it on the left.
                    items:
                        bucket === 'right' ? [bucketModel.title, arrow] : [arrow, bucketModel.title]
                }),
                div({className: 'xh-col-chooser__separator__line'}),
                bucketVisibilityToggle({chooserModel, bucketModel})
            ]
        });
    }
);

interface BucketHeaderProps extends HoistProps {
    chooserModel: ColChooserModel;
    bucketModel: ColChooserBucketModel;
}

/**
 * Bucket-scoped "toggle all visibility" control riding the end of a zone separator, reflecting the
 * aggregate all/none/mixed state. Omitted while the Library is shown - dragging hides then.
 */
const bucketVisibilityToggle = hoistCmp.factory<BucketHeaderProps>(
    ({chooserModel, bucketModel}) => {
        if (chooserModel.isLibraryShown || !bucketModel.hasHideableColumns) return null;

        const visible = bucketModel.aggregateVisible,
            icon =
                visible === null
                    ? Icon.squareMinus()
                    : visible
                      ? Icon.checkSquare({intent: 'primary'})
                      : Icon.square();

        return button({
            className: 'xh-col-chooser__separator__toggle',
            icon,
            minimal: true,
            onClick: () => bucketModel.toggleBucketVisibility()
        });
    }
);

interface ColLibraryPanelProps extends HoistProps {
    chooserModel: ColChooserModel;
}

const colLibraryPanel = hoistCmp.factory<ColLibraryPanelProps>(({chooserModel}) => {
    if (!chooserModel.isLibraryShown) return null;
    // vbox, not vframe - vframe's `flex: auto` would let the library grow into the buckets' space.
    return vbox({
        className: 'xh-col-chooser__library',
        flex: 'none',
        width: chooserModel.libraryWidth,
        item: grid({
            className: 'xh-col-chooser__bucket xh-col-chooser__library-grid',
            flex: 1,
            model: chooserModel.libraryModel.chooserGridModel,
            agOptions: chooserModel.libraryModel.agOptions
        })
    });
});
