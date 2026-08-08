/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColChooserOptionsModel} from '@xh/hoist/appcontainer/ColChooserOptionsModel';
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
 * A component for managing Grid column visibility, ordering, and pinning.
 * @internal
 */
export const [ColChooser, colChooser] = hoistCmp.withFactory<ColChooserProps>({
    displayName: 'ColChooser',
    className: 'xh-col-chooser',
    model: uses(ColChooserModel),

    render({model, className, ...props}) {
        const [layoutProps] = splitLayoutProps(props);
        return vframe({
            className,
            height: model.sizeToContent ? model.height : null,
            ...layoutProps,
            items: [tbar(), contents(), bbar()]
        });
    }
});

type ChooserSectionProps = HoistProps<ColChooserModel>;

const tbar = hoistCmp.factory<ChooserSectionProps>(({model}) =>
    toolbar({
        className: 'xh-col-chooser__tbar',
        items: [
            storeFilterField({
                flex: 1,
                model,
                bind: 'filterText',
                store: model.filterFieldStore,
                autoApply: false,
                onFilterChange: (fn: FilterTestFn) => (model.filterTestFn = fn),
                includeFields: ['name'],
                matchMode: model.filterMatchMode,
                leftIcon: Icon.search(),
                placeholder: 'Search columns...',
                autoFocus: true
            }),
            toggleBtn({
                omit: !model.hasColumnGroups,
                model: model.optionsModel,
                bind: 'showGroups',
                icon: Icon.treeList,
                label: 'Column Groups'
            }),
            toggleBtn({
                omit: !model.columnLibraryEnabled,
                model: model.optionsModel,
                bind: 'showLibrary',
                icon: Icon.books,
                label: 'Column Library'
            }),
            button({
                omit: !model.showRestoreDefaults,
                minimal: true,
                intent: 'danger',
                icon: Icon.reset(),
                tooltip: 'Restore Defaults',
                onClick: () => model.restoreDefaultsAsync().catchDefault()
            }),
            button({
                omit: !model.showCloseButton,
                minimal: true,
                icon: Icon.close(),
                tooltip: 'Close',
                onClick: () => model.close()
            })
        ]
    })
);

const contents = hoistCmp.factory<ChooserSectionProps>(() =>
    hframe(colLibraryPanel(), chooserBuckets())
);

const chooserBuckets = hoistCmp.factory<ChooserSectionProps>(({model}) =>
    vbox({
        flex: model.sizeToContent ? null : 1,
        width: model.sizeToContent ? model.width : null,
        items: [
            pinnedBucket({bucketModel: model.leftBucketModel, bucket: 'left'}),
            columnsSeparator(),
            bucketGrid({bucketModel: model.unpinnedBucketModel, bucket: 'unpinned'}),
            pinnedBucket({bucketModel: model.rightBucketModel, bucket: 'right'})
        ]
    })
);

interface PinnedBucketZoneProps extends HoistProps<ColChooserModel> {
    bucketModel: ColChooserBucketModel;
    bucket: 'left' | 'right';
}

const pinnedBucket = hoistCmp.factory<PinnedBucketZoneProps>(({model, bucketModel, bucket}) => {
    if (!model.columnPinningEnabled && bucketModel.columnCount === 0) return null;
    return fragment(
        bucketSeparator({bucketModel, bucket, omit: bucketModel.columnCount === 0}),
        bucketGrid({bucketModel, bucket})
    );
});

const columnsSeparator = hoistCmp.factory<ChooserSectionProps>(({model}) => {
    const {leftBucketModel, rightBucketModel} = model,
        show = leftBucketModel.columnCount > 0 || rightBucketModel.columnCount > 0;
    return show
        ? bucketSeparator({bucketModel: model.unpinnedBucketModel, bucket: 'unpinned'})
        : null;
});

const bbar = hoistCmp.factory<ChooserSectionProps>(({model}) => {
    if (model.commitOnChange) return null;
    return toolbar(
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
                model.commitPendingAsync().catchDefault();
                model.close();
            }
        })
    );
});

interface ToggleBtnProps extends HoistProps<ColChooserOptionsModel> {
    bind: string;
    icon: (p?: IconProps) => ReactElement;
    label: string;
}

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

interface BucketGridProps extends HoistProps<ColChooserModel> {
    bucketModel: ColChooserBucketModel;
    bucket: 'left' | 'right' | 'unpinned';
}

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
        // Make space for scroll bar in unpinned bucket to avoid jank and mis-alignment with the
        // pinned buckets
        agOptions: pinned
            ? {...bucketModel.agOptions, domLayout: 'autoHeight'}
            : {...bucketModel.agOptions, alwaysShowVerticalScroll: true},
        flex: pinned ? null : 1
    });
});

interface BucketSeparatorProps extends HoistProps<ColChooserModel> {
    bucketModel: ColChooserBucketModel;
    bucket: 'left' | 'right' | 'unpinned';
}

const bucketSeparator = hoistCmp.factory<BucketSeparatorProps>(({bucketModel, bucket}) => {
    const arrow =
        bucket === 'left'
            ? Icon.arrowToLeft({className: 'xh-col-chooser__separator__arrow'})
            : bucket === 'right'
              ? Icon.arrowToRight({className: 'xh-col-chooser__separator__arrow'})
              : null;

    return div({
        className: classNames('xh-col-chooser__separator', `xh-col-chooser__separator--${bucket}`),
        items: [
            div({className: 'xh-col-chooser__separator__line'}),
            span({
                className: 'xh-col-chooser__separator__label',
                // Arrow trails the label on the right rail, leads it on the left.
                items: bucket === 'right' ? [bucketModel.title, arrow] : [arrow, bucketModel.title]
            }),
            div({className: 'xh-col-chooser__separator__line'}),
            bucketVisibilityToggle({bucketModel})
        ]
    });
});

interface BucketHeaderProps extends HoistProps<ColChooserModel> {
    bucketModel: ColChooserBucketModel;
}

const bucketVisibilityToggle = hoistCmp.factory<BucketHeaderProps>(({model, bucketModel}) => {
    if (model.isLibraryShown || !bucketModel.hasHideableColumns) return null;

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
});

const colLibraryPanel = hoistCmp.factory<ChooserSectionProps>(({model}) => {
    if (!model.isLibraryShown) return null;
    return vbox({
        className: 'xh-col-chooser__library',
        flex: 'none',
        width: model.libraryWidth,
        item: grid({
            className: 'xh-col-chooser__bucket xh-col-chooser__library-grid',
            flex: 1,
            model: model.libraryModel.chooserGridModel,
            agOptions: model.libraryModel.agOptions
        })
    });
});
