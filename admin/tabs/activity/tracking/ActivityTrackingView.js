/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {form} from '@xh/hoist/cmp/form';
import {grid} from '@xh/hoist/cmp/grid';
import {filler, hframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, colChooserButton, exportButton} from '@xh/hoist/desktop/cmp/button';
import {dimensionChooser} from '@xh/hoist/desktop/cmp/dimensionchooser';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {dateInput, select, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {ActivityTrackingModel, PERSIST_ACTIVITY} from './ActivityTrackingModel';
import {chartsPanel} from './charts/ChartsPanel';
import {activityDetailView} from './detail/ActivityDetailView';

export const activityTrackingView = hoistCmp.factory({
    model: creates(ActivityTrackingModel),

    render({model}) {
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
    ({model}) => {
        const {lookups} = model;
        return toolbar(
            form({
                fieldDefaults: {label: null},
                items: [
                    formField({
                        field: 'category',
                        label: 'Category:',
                        item: select({
                            placeholder: 'All categories',
                            options: lookups.categories,
                            ...selectInputProps
                        })
                    }),
                    toolbarSep(),
                    button({
                        icon: Icon.angleLeft(),
                        onClick: () => model.adjustDates('subtract')
                    }),
                    formField({
                        field: 'startDate',
                        item: dateInput({...dateInputProps})
                    }),
                    Icon.caretRight(),
                    formField({
                        field: 'endDate',
                        item: dateInput({...dateInputProps})
                    }),
                    button({
                        icon: Icon.angleRight(),
                        onClick: () => model.adjustDates('add'),
                        disabled: model.endDate >= LocalDate.today()
                    }),
                    toolbarSep(),
                    formField({
                        field: 'username',
                        item: select({
                            placeholder: 'All Users',
                            options: lookups.usernames,
                            ...selectInputProps
                        })
                    }),
                    formField({
                        field: 'device',
                        item: select({
                            placeholder: 'All Devices',
                            options: lookups.devices,
                            ...selectInputProps
                        })
                    }),
                    formField({
                        field: 'browser',
                        item: select({
                            placeholder: 'All Browsers',
                            options: lookups.browsers,
                            ...selectInputProps
                        })
                    }),
                    formField({
                        field: 'msg',
                        item: textInput({
                            placeholder: 'Search messages...',
                            enableClear: true,
                            width: 160
                        })
                    }),
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
                dimensionChooser({buttonWidth: 250}),
                filler(),
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
const selectInputProps = {width: 160, enableClear: true};