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
import {dateInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {LocalDate} from '@xh/hoist/utils/datetime';

import {ActivityModel} from './ActivityModel';
import './ActivityPanel.scss';
import {chartsPanel} from './charts/ChartsPanel';
import {activityDetailView} from './detail/ActivityDetailView';

export const activityPanel = hoistCmp.factory({
    model: creates(ActivityModel),

    render({model}) {
        return panel({
            mask: 'onLoad',
            className: 'xh-admin-activity-panel',
            tbar: tbar(),
            item: hframe(
                panel({
                    title: 'Grouped Results',
                    icon: Icon.users(),
                    model: {
                        side: 'left',
                        defaultSize: 550
                    },
                    tbar: [
                        dimensionChooser(),
                        filler(),
                        colChooserButton(),
                        exportButton()
                    ],
                    items: [
                        grid({
                            flex: 1,
                            onRowDoubleClicked: (e) => model.expandRowOrOpenDetail(e)
                        }),
                        chartsPanel()
                    ]
                }),
                activityDetailView({
                    flex: 1
                })
            )
        });
    }
});

const tbar = hoistCmp.factory(
    ({model}) => {
        return toolbar(
            form(
                button({
                    icon: Icon.angleLeft(),
                    onClick: () => model.adjustDates('subtract')
                }),
                formField({
                    field: 'startDate',
                    label: null,
                    item: dateInput({...dateProps})
                }),
                Icon.caretRight(),
                formField({
                    field: 'endDate',
                    label: null,
                    item: dateInput({...dateProps})
                }),
                button({
                    icon: Icon.angleRight(),
                    onClick: () => model.adjustDates('add'),
                    disabled: model.endDate >= LocalDate.today()
                }),
                button({
                    icon: Icon.reset(),
                    onClick: () => model.adjustDates('subtract', true)
                }),
                toolbarSep(),
                formField({
                    field: 'username',
                    label: null,
                    item: textInput({placeholder: 'Username', ...textProps})
                }),
                formField({
                    field: 'msg',
                    label: null,
                    item: textInput({placeholder: 'Message', ...textProps})
                }),
                formField({
                    field: 'category',
                    label: null,
                    item: textInput({placeholder: 'Category', ...textProps})
                }),
                formField({
                    field: 'device',
                    label: null,
                    item: textInput({placeholder: 'Device', ...textProps})
                }),
                formField({
                    field: 'browser',
                    label: null,
                    item: textInput({placeholder: 'Browser', ...textProps})
                }),
                button({
                    icon: Icon.reset(),
                    onClick: () => model.formModel.reset()
                }),
                filler(),
                exportButton()
            )
        );
    }
);

const dateProps = {
    popoverPosition: 'bottom',
    valueType: 'localDate',
    width: 120
};

const textProps = {width: 140, enableClear: true};