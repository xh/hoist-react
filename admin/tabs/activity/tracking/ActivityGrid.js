/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistElemFactory, useLocalModel} from '@xh/hoist/core';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {dateInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {button, exportButton, refreshButton} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {LocalDate} from '@xh/hoist/utils/datetime';

import {ActivityGridModel} from './ActivityGridModel';
import {activityDetail} from './ActivityDetail';

export const activityGrid = hoistElemFactory(
    props => {
        const model = useLocalModel(ActivityGridModel);
        return panel({
            mask: model.loadModel,
            tbar: renderToolbar(model),
            items: [
                grid({
                    model: model.gridModel,
                    onRowDoubleClicked: (e) => model.openDetail(e.data)
                }),
                activityDetail({model})
            ]
        });
    }
);

function renderToolbar(model) {
    const {gridModel} = model;

    return [
        button({
            icon: Icon.angleLeft(),
            onClick: () => model.adjustDates('subtract')
        }),
        renderDateInput({model, bind: 'startDate'}),
        Icon.caretRight(),
        renderDateInput({model, bind: 'endDate'}),
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
        renderTextInput({model, bind: 'username', placeholder: 'Username', enableClear: true}),
        renderTextInput({model, bind: 'msg', placeholder: 'Message', enableClear: true}),
        renderTextInput({model, bind: 'category', placeholder: 'Category', enableClear: true}),
        renderTextInput({model, bind: 'device', placeholder: 'Device', enableClear: true}),
        renderTextInput({model, bind: 'browser', placeholder: 'Browser', enableClear: true}),
        refreshButton({model}),
        filler(),
        gridCountLabel({gridModel, unit: 'log'}),
        exportButton({gridModel})
    ];
}

function renderDateInput(args) {
    return dateInput({
        popoverPosition: 'bottom',
        valueType: 'localDate',
        width: 120,
        ...args
    });
}

function renderTextInput(args) {
    return textInput({
        width: 140,
        ...args
    });
}
