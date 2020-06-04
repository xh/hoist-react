/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {dimensionChooser} from '@xh/hoist/desktop/cmp/dimensionchooser';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {form} from '@xh/hoist/cmp/form';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {dateInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {LocalDate} from '@xh/hoist/utils/datetime';

import {ActivityModel} from './ActivityModel';
import {activityDetail} from './ActivityDetail';
import {chartsPanel} from './charts/ChartsPanel';
import './ActivityPanel.scss'

export const activityPanel = hoistCmp.factory({
    model: creates(ActivityModel),

    render({model}) {
        return panel({
            mask: 'onLoad',
            className: 'activity-panel',
            tbar: tbar(),
            items: [
                grid({onRowDoubleClicked: (e) => model.expandRowOrOpenDetail(e)}),
                chartsPanel(),
                activityDetail()
            ]
        });
    }
});

const tbar = hoistCmp.factory(
    ({model}) => {
        return toolbar(
            form(
                dimensionChooser(),
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