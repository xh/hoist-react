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
        const [layoutProps] = splitLayoutProps(props);
        // The root reads no frequently-changing observables, so it renders once. Each section below
        // is its own observer and re-renders only when the observables it reads change - keeping the
        // record/filter churn (which re-renders the bucket zones) out of the toolbar and footer. The
        // Blueprint filter input in particular self-measures its width and will loop if it is pulled
        // into a re-render while the buckets below it are reflowing.
        //
        // Overlays (popover/dialog) hug their content, so the root takes only a fixed height and its
        // width follows the buckets + library below. The docked panel is sized by its outer
        // PanelModel, so the root just fills it.
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
 * minimal display-toggle / restore-defaults buttons. Deliberately reads no bucket record state, so
 * it stays stable while filtering or dragging churns the grids below.
 */
const chooserTopBar = hoistCmp.factory<ChooserSectionProps>(({chooserModel}) =>
    toolbar({
        className: 'xh-column-chooser__tbar',
        items: [
            storeFilterField({
                flex: 1,
                model: chooserModel,
                bind: 'filterText',
                // Bind a real store only to infer fields + suppress the control's fallback GridModel
                // context-lookup; the predicate is applied to every grid via applyFilterTestFn.
                store: chooserModel.filterFieldStore,
                autoApply: false,
                onFilterChange: (fn: FilterTestFn) => chooserModel.applyFilterTestFn(fn),
                // Match only fields shown in the grids - name (buckets + library) and the library's
                // chooserGroup header. Description is a bucket tooltip only, so matching it would
                // surface rows on text the user can't see.
                includeFields: ['name', 'chooserGroup'],
                matchMode: chooserModel.filterMatchMode,
                placeholder: 'Filter columns...'
            }),
            viewToggle({
                omit: !chooserModel.hasColumnGroups,
                active: chooserModel.showGroups,
                icon: Icon.treeList,
                label: 'Column Groups',
                onToggle: () => (chooserModel.showGroups = !chooserModel.showGroups)
            }),
            viewToggle({
                omit: !chooserModel.columnLibraryEnabled,
                active: chooserModel.showLibrary,
                icon: Icon.books,
                label: 'Column Library',
                onToggle: () => (chooserModel.showLibrary = !chooserModel.showLibrary)
            }),
            button({
                omit: !chooserModel.showRestoreDefaults,
                minimal: true,
                intent: 'danger',
                icon: Icon.reset(),
                tooltip: 'Restore Defaults',
                onClick: () => chooserModel.restoreDefaultsAsync()
            })
        ]
    })
);

/** Library panel (when shown) beside the stack of bucket zones. */
const chooserBody = hoistCmp.factory<ChooserSectionProps>(({chooserModel}) =>
    hframe(columnLibraryPanel({chooserModel}), bucketStack({chooserModel}))
);

/**
 * The bucket zones in master order: pinned-left, the unpinned "Columns" divider + grid, pinned-right.
 * Holds no observable state of its own - each zone re-renders independently off its own bucket. Takes
 * a fixed width in the content-hugging overlays; flexes to fill the dock (beside the fixed-width
 * library) in the docked panel.
 */
const bucketStack = hoistCmp.factory<ChooserSectionProps>(({chooserModel}) =>
    vbox({
        flex: chooserModel.sizeToContent ? null : 1,
        width: chooserModel.sizeToContent ? chooserModel.width : null,
        items: [
            pinnedBucketZone({chooserModel, bucket: chooserModel.leftBucketModel, variant: 'left'}),
            columnsSeparator({chooserModel}),
            bucketGrid({bucketModel: chooserModel.unpinnedBucketModel, bucket: 'unpinned'}),
            pinnedBucketZone({
                chooserModel,
                bucket: chooserModel.rightBucketModel,
                variant: 'right'
            })
        ]
    })
);

interface PinnedBucketZoneProps extends ChooserSectionProps {
    bucket: ColumnChooserBucketModel;
    variant: 'left' | 'right';
}

/**
 * A pinned rail: its zone separator (shown only when the rail holds rendered columns) above its
 * grid, emitted as siblings so both stay direct flex children of the stack. Scoped to a single
 * bucket's `columnCount`, so only this rail re-renders when its own membership changes - and it
 * collapses to a bare drop strip (no separator) when filtered empty, like a genuinely empty rail.
 * Omitted entirely when column pinning is disabled.
 */
const pinnedBucketZone = hoistCmp.factory<PinnedBucketZoneProps>(
    ({chooserModel, bucket, variant}) => {
        if (!chooserModel.columnPinningEnabled) return null;
        return fragment(
            bucketSeparator({chooserModel, bucket, variant, omit: bucket.columnCount === 0}),
            bucketGrid({bucketModel: bucket, bucket: variant})
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
    const {columnPinningEnabled, leftBucketModel, rightBucketModel} = chooserModel,
        show =
            columnPinningEnabled &&
            (leftBucketModel.columnCount > 0 || rightBucketModel.columnCount > 0);
    return show
        ? bucketSeparator({
              chooserModel,
              bucket: chooserModel.unpinnedBucketModel,
              variant: 'unpinned'
          })
        : null;
});

/**
 * Footer Save/Cancel actions. Absent when auto-committing. Isolated so its `isDirty` dependency
 * re-renders only these buttons.
 */
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

interface ViewToggleProps extends HoistProps {
    active: boolean;
    icon: (p?: IconProps) => ReactElement;
    label: string;
    onToggle: () => void;
}

/**
 * Minimal icon-only display toggle riding the top bar - solid + primary intent when active, thin +
 * muted gray when not. Tooltip reflects the action it will perform (`Show`/`Hide`) given the current
 * state.
 */
const viewToggle = hoistCmp.factory<ViewToggleProps>(({active, icon, label, onToggle}) =>
    button({
        className: 'xh-column-chooser__toggle',
        minimal: true,
        intent: active ? 'primary' : null,
        icon: icon({prefix: active ? 'far' : 'fat'}),
        tooltip: `${active ? 'Hide' : 'Show'} ${label}`,
        onClick: onToggle
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
        // The unpinned bucket permanently reserves its vertical-scrollbar gutter so its action-column
        // checkboxes hold the same right edge as the pinned rails and separator toggles whether or not
        // it overflows (SCSS suppresses the empty track when it doesn't). ag-grid otherwise collapses
        // that gutter to 0 with no overflow. Pinned rails auto-height and never scroll.
        agOptions: pinned
            ? {...bucket.agOptions, domLayout: 'autoHeight'}
            : {...bucket.agOptions, alwaysShowVerticalScroll: true},
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

const columnLibraryPanel = hoistCmp.factory<ColumnLibraryPanelProps>(({chooserModel}) => {
    if (!chooserModel.isLibraryShown) return null;
    // A vbox (not vframe) for a fixed-width column: vframe forces `flex: auto`, which would let the
    // library grow into the buckets' space instead of the buckets flexing to fill the dock. The grid
    // takes `flex: 1` to fill the library's height.
    return vbox({
        className: 'xh-column-chooser__library',
        flex: 'none',
        width: chooserModel.libraryWidth,
        item: grid({
            className: 'xh-column-chooser__bucket xh-column-chooser__library-grid',
            flex: 1,
            model: chooserModel.libraryModel.chooserGridModel,
            agOptions: chooserModel.libraryModel.agOptions
        })
    });
});
