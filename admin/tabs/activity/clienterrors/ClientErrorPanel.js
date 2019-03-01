/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
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

@HoistComponent
export class ClientErrorPanel extends Component {

    model = new ClientErrorModel();

    render() {
        const {model} = this;
        return panel({
            mask: model.loadModel,
            tbar: this.renderToolbar(),
            items: [
                grid({
                    model: model.gridModel,
                    onRowDoubleClicked: (e) => model.openDetail(e.data)
                }),
                clientErrorDetail({model})
            ]
        });
    }

    renderToolbar() {
        const {model} = this;
        return toolbar(
            this.dateInput({bind: 'startDate'}),
            Icon.angleRight(),
            this.dateInput({bind: 'endDate'}),
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
            this.textInput({bind: 'username', placeholder: 'User...'}),
            this.textInput({bind: 'error', placeholder: 'Error...'}),
            refreshButton({model}),
            filler(),
            storeCountLabel({gridModel: model.gridModel, unit: 'client error'}),
            exportButton({gridModel: model.gridModel})
        );
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    dateInput(args) {
        return dateInput({
            model: this.model,
            popoverPosition: 'bottom',
            width: 100,
            ...args
        });
    }

    textInput(args) {
        return textInput({
            model: this.model,
            width: 150,
            ...args
        });
    }
}