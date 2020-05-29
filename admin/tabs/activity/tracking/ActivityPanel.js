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
import {button, exportButton, refreshButton} from '@xh/hoist/desktop/cmp/button';
import {dateInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {LocalDate} from '@xh/hoist/utils/datetime';

import {ActivityModel} from './ActivityModel';
import {activityDetail} from './ActivityDetail';
import {chartsPanel} from './charts/ChartsPanel';

export const activityPanel = hoistCmp.factory({
    model: creates(ActivityModel),

    render({model}) {
        return panel({
            mask: 'onLoad',
            tbar: tbar(),
            items: [
                grid({onRowDoubleClicked: (e) => model.openDetail(e.data)}),
                chartsPanel(),
                activityDetail()
            ]
        });
    }
});

const tbar = hoistCmp.factory(
    ({model}) => {
        return toolbar(
            dimensionChooser(),
            button({
                icon: Icon.angleLeft(),
                onClick: () => model.adjustDates('subtract')
            }),
            dateInput({bind: 'startDate', ...dateProps}),
            Icon.caretRight(),
            dateInput({bind: 'endDate', ...dateProps}),
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
            textInput({bind: 'username', placeholder: 'Username', ...textProps}),
            textInput({bind: 'msg', placeholder: 'Message', ...textProps}),
            textInput({bind: 'category', placeholder: 'Category', ...textProps}),
            textInput({bind: 'device', placeholder: 'Device', ...textProps}),
            textInput({bind: 'browser', placeholder: 'Browser', ...textProps}),
            refreshButton(),
            filler(),
            exportButton()
        );
    }
);

const dateProps = {
    popoverPosition: 'bottom',
    valueType: 'localDate',
    width: 120
};

const textProps = {width: 140, enableClear: true};