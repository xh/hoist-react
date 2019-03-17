/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistComponent, useLocalModel} from '@xh/hoist/core';
import {grid} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {dateInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {button, buttonGroup, exportButton, refreshButton} from '@xh/hoist/desktop/cmp/button';
import {storeCountLabel} from '@xh/hoist/desktop/cmp/store';
import {Icon} from '@xh/hoist/icon';

import {ActivityGridModel} from './ActivityGridModel';
import {activityDetail} from './ActivityDetail';

export const [ActivityGrid, activityGrid] = hoistComponent({
    render(props) {
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
});

//------------------
// Implementation
//------------------
function renderToolbar(model) {
    return toolbar(
        renderDateInput({model, bind: 'startDate'}),
        Icon.angleRight(),
        renderDateInput({model, bind: 'endDate'}),
        buttonGroup(
            button({
                icon: Icon.caretLeft(),
                onClick: () => model.adjustDates('subtract')
            }),
            button({
                icon: Icon.caretRight(),
                onClick: () => model.adjustDates('add')
            }),
            button({
                icon: Icon.arrowToRight(),
                onClick: () => model.adjustDates('subtract', true)
            })
        ),
        toolbarSep(),
        renderTextInput({model, bind: 'username', placeholder: 'User...'}),
        renderTextInput({model, bind: 'msg', placeholder: 'Msg...'}),
        renderTextInput({model, bind: 'category', placeholder: 'Category...'}),
        renderTextInput({model, bind: 'device', placeholder: 'Device...'}),
        renderTextInput({model, bind: 'browser', placeholder: 'Browser...'}),
        refreshButton({model}),
        filler(),
        storeCountLabel({gridModel: model.gridModel, unit: 'log'}),
        exportButton({gridModel: model.gridModel})
    );
}
    
function renderDateInput(args) {
    return dateInput({
        popoverPosition: 'bottom',
        width: 100,
        commitOnChange: true,
        ...args
    });
}

function renderTextInput(args) {
    return textInput({
        width: 140,
        ...args
    });
}
