/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {dataFieldsEditor} from '@xh/hoist/admin/tabs/activity/tracking/datafields/DataFieldsEditor';
import {errorMessage} from '@xh/hoist/cmp/error';
import {form} from '@xh/hoist/cmp/form';
import {grid} from '@xh/hoist/cmp/grid';
import {div, filler, hframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, colChooserButton, exportButton} from '@xh/hoist/desktop/cmp/button';
import {dateRangePicker} from '@xh/hoist/desktop/cmp/daterange';
import {filterChooser} from '@xh/hoist/desktop/cmp/filter';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {groupingChooser} from '@xh/hoist/desktop/cmp/grouping';
import {select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {viewManager} from '@xh/hoist/desktop/cmp/viewmanager';
import {Icon} from '@xh/hoist/icon';
import {ActivityTrackingModel} from './ActivityTrackingModel';
import {aggChartPanel} from '@xh/hoist/admin/tabs/activity/tracking/chart/AggChartPanel';
import {activityDetailView} from './detail/ActivityDetailView';
import './ActivityTracking.scss';

export const activityTrackingPanel = hoistCmp.factory({
    displayName: 'ActivityTrackingPanel',
    model: creates(ActivityTrackingModel),

    render({model}) {
        if (!model.enabled) {
            return errorMessage({
                error: 'Activity tracking disabled via xhActivityTrackingConfig.'
            });
        }

        return panel({
            className: 'xh-admin-activity-panel',
            tbar: tbar(),
            items: [filterBar(), hframe(aggregateView(), activityDetailView({flex: 1}))],
            mask: 'onLoad'
        });
    }
});

const tbar = hoistCmp.factory<ActivityTrackingModel>(({model}) =>
    toolbar(
        viewManager({
            model: model.viewManagerModel,
            showSaveButton: 'always'
        }),
        '-',
        dateRangePicker({showStepButtons: true, testId: 'activity-period'}),
        toolbarSep(),
        filterChooserToggleButton(),
        toolbarSep(),
        dataFieldsEditor(),
        filler(),
        form({
            item: formField({
                field: 'maxRows',
                label: 'Max rows',
                width: 140,
                item: select({
                    enableFilter: false,
                    hideDropdownIndicator: true,
                    options: model.maxRowOptions
                })
            })
        })
    )
);

const filterChooserToggleButton = hoistCmp.factory<ActivityTrackingModel>(({model}) => {
    const {hasFilter, showFilterChooser} = model;

    return button({
        text: 'Filter',
        icon: Icon.filter({prefix: hasFilter ? 'fas' : 'far'}),
        intent: hasFilter ? 'warning' : null,
        outlined: showFilterChooser,
        onClick: () => model.toggleFilterChooser()
    });
});

const filterBar = hoistCmp.factory<ActivityTrackingModel>(({model}) => {
    return model.showFilterChooser
        ? toolbar(
              filterChooser({
                  popover: true,
                  flex: 1,
                  enableClear: true
              })
          )
        : null;
});

const aggregateView = hoistCmp.factory<ActivityTrackingModel>(({model}) => {
    return panel({
        collapsedTitle: 'Aggregate Activity',
        collapsedIcon: Icon.users(),
        compactHeader: true,
        modelConfig: {
            side: 'left',
            defaultSize: 500,
            persistWith: {...model.persistWith, path: 'aggPanel'}
        },
        tbar: toolbar({
            compact: true,
            items: [
                groupingChooser({flex: 10, maxWidth: 300}),
                filler(),
                colChooserButton(),
                exportButton()
            ]
        }),
        items: [
            grid({flex: 1}),
            div({
                className: 'xh-admin-activity-panel__max-rows-alert',
                items: [
                    Icon.warning(),
                    `Entries truncated to most recent ${model.maxRows / 1000}k leaf rows.`
                ],
                omit: !model.maxRowsReached
            }),
            aggChartPanel()
        ]
    });
});
