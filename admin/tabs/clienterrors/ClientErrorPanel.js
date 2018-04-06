/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {button} from 'hoist/kit/blueprint';
import {hoistComponent} from 'hoist/core';
import {grid} from 'hoist/grid';
import {filler, vframe} from 'hoist/layout';
import {textField, dayField, exportButton, refreshButton, storeCountLabel, toolbar, toolbarSep} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

import {ClientErrorModel} from './ClientErrorModel';
import {clientErrorDetail} from './ClientErrorDetail';

@hoistComponent()
export class ClientErrorPanel extends Component {

    localModel = new ClientErrorModel();

    render() {
        const model = this.model;
        return vframe(
            this.renderToolbar(),
            grid({
                model: model.gridModel,
                gridOptions: {
                    rowSelection: 'single',
                    onRowDoubleClicked: this.onRowDoubleClicked
                }
            }),
            clientErrorDetail({model})
        );
    }

    renderToolbar() {
        const model = this.model;
        return toolbar(
            this.dayField({field: 'startDate'}),
            Icon.angleRight(),
            this.dayField({field: 'endDate'}),
            button({
                icon: Icon.caretLeft(),
                onClick: this.onDateGoBackClick
            }),
            button({
                icon: Icon.caretRight(),
                onClick: this.onDateGoForwardClick,
                cls: 'xh-no-pad'
            }),
            button({
                icon: Icon.arrowToRight(),
                onClick: this.onGoToCurrentDateClick,
                cls: 'xh-no-pad'
            }),
            toolbarSep(),
            this.textField({field: 'username', placeholder: 'User...'}),
            this.textField({field: 'error', placeholder: 'Error...'}),
            refreshButton({model}),
            filler(),
            storeCountLabel({
                store: model.store,
                unit: 'client error'
            }),
            exportButton({model})
        );
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    dayField(args) {
        return dayField({
            model: this.model,
            onCommit: this.onCommit,
            popoverPosition: 'bottom',
            width: 100,
            ...args
        });
    }

    textField(args) {
        return textField({
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

    onRowDoubleClicked = () => {
        this.model.setDetailOpen(true);
    }

    async loadAsync() {
        return this.model.loadAsync();
    }
}