/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {form} from '@xh/hoist/cmp/form';
import {grid} from '@xh/hoist/cmp/grid';
import {hframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, colChooserButton, exportButton} from '@xh/hoist/desktop/cmp/button';
import {filterChooser} from '@xh/hoist/desktop/cmp/filter';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {groupingChooser} from '@xh/hoist/desktop/cmp/grouping';
import {dateInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {buttonGroup} from '@xh/hoist/kit/blueprint';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {ActivityTrackingModel, PERSIST_ACTIVITY} from './ActivityTrackingModel';
import {chartsPanel} from './charts/ChartsPanel';
import {activityDetailView} from './detail/ActivityDetailView';

export const activityTrackingView = hoistCmp.factory({
    model: creates(ActivityTrackingModel),

    render() {
        return panel({
            mask: 'onLoad',
            className: 'xh-admin-activity-panel',
            tbar: tbar(),
            item: hframe(
                aggregateView(),
                activityDetailView({flex: 1})
            )
        });
    }
});

const tbar = hoistCmp.factory(
    /** @param {ActivityTrackingModel} model */
    ({model}) => {
        return toolbar(
            form({
                fieldDefaults: {label: null},
                items: [
                    button({
                        icon: Icon.angleLeft(),
                        onClick: () => model.adjustDates('subtract')
                    }),
                    formField({
                        field: 'startDay',
                        item: dateInput({...dateInputProps})
                    }),
                    Icon.caretRight(),
                    formField({
                        field: 'endDay',
                        item: dateInput({...dateInputProps})
                    }),
                    button({
                        icon: Icon.angleRight(),
                        onClick: () => model.adjustDates('add'),
                        disabled: model.endDay >= LocalDate.currentAppDay()
                    }),
                    buttonGroup(
                        button({text: '6m', outlined: true, width: 40, onClick: () => model.adjustStartDate(6, 'months')}),
                        button({text: '1m', outlined: true, width: 40, onClick: () => model.adjustStartDate(1, 'months')}),
                        button({text: '7d', outlined: true, width: 40, onClick: () => model.adjustStartDate(7, 'days')}),
                        button({text: '1d', outlined: true, width: 40, onClick: () => model.adjustStartDate(1, 'days')})
                    ),
                    toolbarSep(),
                    filterChooser({
                        flex: 1,
                        enableClear: true
                    }),
                    toolbarSep(),
                    button({
                        icon: Icon.reset(),
                        intent: 'danger',
                        title: 'Reset query to defaults',
                        onClick: () => model.resetQuery()
                    })
                ]
            })
        );
    }
);

const aggregateView = hoistCmp.factory(
    /** @param {ActivityTrackingModel} model */
    ({model}) => {
        return panel({
            title: 'Aggregate Activity Report',
            icon: Icon.users(),
            compactHeader: true,
            model: {
                side: 'left',
                defaultSize: 400,
                persistWith: {...PERSIST_ACTIVITY, path: 'aggReportPanel'}
            },
            tbar: [
                groupingChooser({flex: 1}),
                colChooserButton(),
                exportButton()
            ],
            items: [
                grid({
                    flex: 1,
                    agOptions: {groupDefaultExpanded: 1},
                    onRowDoubleClicked: (e) => model.toggleRowExpandCollapse(e)
                }),
                chartsPanel()
            ]
        });
    }
);

const dateInputProps = {popoverPosition: 'bottom', valueType: 'localDate', width: 120};
