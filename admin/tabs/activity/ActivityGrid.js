/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {grid} from 'hoist/grid';
import {vframe, filler} from 'hoist/layout';
import {button} from 'hoist/kit/blueprint';
import {textField, dayField, exportButton, refreshButton, storeCountLabel, toolbar, toolbarSep} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

@hoistComponent()
export class ActivityGrid extends Component {

    render() {
        return vframe(
            this.renderToolbar(),
            grid({
                model: this.model.gridModel,
                gridOptions: {
                    rowSelection: 'single'
                }
            })
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
            this.textField({field: 'msg', placeholder: 'Msg...'}),
            this.textField({field: 'category', placeholder: 'Category...'}),
            this.textField({field: 'device', placeholder: 'Device...'}),
            this.textField({field: 'browser', placeholder: 'Browser...'}),
            refreshButton({model}),
            filler(),
            storeCountLabel({
                store: model.store,
                unit: 'log'
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
            popoverPosition: 'bottom',
            width: 100,
            onCommit: this.onCommit,
            ...args
        });
    }

    textField(args) {
        return textField({
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

    onExportClick = () => {
        this.model.exportGrid();
    }

}
export const activityGrid = elemFactory(ActivityGrid);
