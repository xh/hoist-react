/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {grid} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {dateInput, textInput} from '@xh/hoist/desktop/cmp/form';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {button, buttonGroup, exportButton, refreshButton} from '@xh/hoist/desktop/cmp/button';
import {storeCountLabel} from '@xh/hoist/desktop/cmp/store';
import {Icon} from '@xh/hoist/icon';

import {activityDetail} from './ActivityDetail';

@HoistComponent
export class ActivityGrid extends Component {

    render() {
        const {model} = this;
        return panel({
            mask: model.loadModel,
            tbar: this.renderToolbar(),
            items: [
                grid({
                    model: model.gridModel,
                    onRowDoubleClicked: this.onRowDoubleClicked
                }),
                activityDetail({model})
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
                    onClick: this.onDateGoForwardClick
                }),
                button({
                    icon: Icon.arrowToRight(),
                    onClick: this.onGoToCurrentDateClick
                })
            ),
            toolbarSep(),
            this.textInput({field: 'username', placeholder: 'User...'}),
            this.textInput({field: 'msg', placeholder: 'Msg...'}),
            this.textInput({field: 'category', placeholder: 'Category...'}),
            this.textInput({field: 'device', placeholder: 'Device...'}),
            this.textInput({field: 'browser', placeholder: 'Browser...'}),
            refreshButton({model}),
            filler(),
            storeCountLabel({gridModel: model.gridModel, unit: 'log'}),
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
            onCommit: this.onCommit,
            commitOnChange: true,
            ...args
        });
    }

    textInput(args) {
        return textInput({
            model: this.model,
            width: 140,
            onCommit: this.onCommit,
            ...args
        });
    }

    onCommit = () => {
        this.model.loadAsync();
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

    onRowDoubleClicked = (e) => {
        this.model.openDetail(e.data);
    }
}
export const activityGrid = elemFactory(ActivityGrid);