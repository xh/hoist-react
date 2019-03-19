/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistComponent, useLocalModel} from '@xh/hoist/core';
import {filler} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {grid} from '@xh/hoist/cmp/grid';
import {textInput, dateInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {button, buttonGroup, exportButton, refreshButton} from '@xh/hoist/desktop/cmp/button';
import {storeCountLabel} from '@xh/hoist/desktop/cmp/store';
import {Icon} from '@xh/hoist/icon';

import {ClientErrorModel} from './ClientErrorModel';
import {clientErrorDetail} from './ClientErrorDetail';

export const [ClientErrorPanel] = hoistComponent(() => {
    const model = useLocalModel(ClientErrorModel);
    return panel({
        mask: model.loadModel,
        tbar: renderToolbar(model),
        items: [
            grid({
                model: model.gridModel,
                onRowDoubleClicked: (e) => model.openDetail(e.data)
            }),
            clientErrorDetail({model})
        ]
    });
});

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
        renderTextInput({model, bind: 'error', placeholder: 'Error...'}),
        refreshButton({model}),
        filler(),
        storeCountLabel({gridModel: model.gridModel, unit: 'client error'}),
        exportButton({gridModel: model.gridModel})
    );
}

function renderDateInput(args) {
    return dateInput({
        popoverPosition: 'bottom',
        width: 100,
        ...args
    });
}

function renderTextInput(args) {
    return textInput({
        width: 150,
        ...args
    });
}