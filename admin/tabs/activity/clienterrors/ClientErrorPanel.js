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
import {textInput, dateInput} from '@xh/hoist/desktop/cmp/form';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {button, exportButton, refreshButton} from '@xh/hoist/desktop/cmp/button';
import {buttonGroup} from '@xh/hoist/kit/blueprint';
import {storeCountLabel} from '@xh/hoist/desktop/cmp/store';
import {Icon} from '@xh/hoist/icon';

import {ClientErrorModel} from './ClientErrorModel';
import {clientErrorDetail} from './ClientErrorDetail';

@HoistComponent
export class ClientErrorPanel extends Component {

    localModel = new ClientErrorModel();

    render() {
        const {model} = this;
        return panel({
            tbar: this.renderToolbar(),
            items: [
                grid({
                    model: model.gridModel,
                    onRowDoubleClicked: this.onRowDoubleClicked
                }),
                clientErrorDetail({model})
            ]
        });
    }

    renderToolbar() {
        const model = this.model;
        return toolbar(
            this.dateInput({field: 'startDate'}),
            Icon.angleRight(),
            this.dateInput({field: 'endDate'}),
            buttonGroup(
                button({
                    icon: Icon.caretLeft(),
                    onClick: this.onDateGoBackClick
                }),
                button({
                    icon: Icon.caretRight(),
                    onClick: this.onDateGoForwardClick,
                    className: 'xh-no-pad'
                }),
                button({
                    icon: Icon.arrowToRight(),
                    onClick: this.onGoToCurrentDateClick,
                    className: 'xh-no-pad'
                })
            ),
            toolbarSep(),
            this.textInput({field: 'username', placeholder: 'User...'}),
            this.textInput({field: 'error', placeholder: 'Error...'}),
            refreshButton({model}),
            filler(),
            storeCountLabel({gridModel: model.gridModel, unit: 'client error'}),
            exportButton({model: model.gridModel, exportOptions: {type: 'excelTable'}})
        );
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    dateInput(args) {
        return dateInput({
            model: this.model,
            onCommit: this.onCommit,
            commitOnChange: true,
            popoverPosition: 'bottom',
            width: 100,
            ...args
        });
    }

    textInput(args) {
        return textInput({
            model: this.model,
            onCommit: this.onCommit,
            width: 150,
            ...args
        });
    }

    onDateGoBackClick = () => {
        this.model.adjustDates('subtract');
    }

    onDateGoForwardClick = () => {
        this.model.adjustDates('add');
    }

    onGoToCurrentDateClick = () => {
        this.model.adjustDates('subtract', true);
    }

    onCommit = () => {
        this.loadAsync();
    }

    onRowDoubleClicked = (e) => {
        this.model.openDetail(e.data);
    }

    async loadAsync() {
        return this.model.loadAsync();
    }
}