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
import {dateInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {button, buttonGroup, exportButton, refreshButton} from '@xh/hoist/desktop/cmp/button';
import {storeCountLabel} from '@xh/hoist/desktop/cmp/store';
import {Icon} from '@xh/hoist/icon';

import {ActivityGridModel} from './ActivityGridModel';
import {activityDetail} from './ActivityDetail';

@HoistComponent
export class ActivityGrid extends Component {

    model = new ActivityGridModel();

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
                activityDetail({model})
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
            this.textInput({bind: 'msg', placeholder: 'Msg...'}),
            this.textInput({bind: 'category', placeholder: 'Category...'}),
            this.textInput({bind: 'device', placeholder: 'Device...'}),
            this.textInput({bind: 'browser', placeholder: 'Browser...'}),
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
            commitOnChange: true,
            ...args
        });
    }

    textInput(args) {
        return textInput({
            model: this.model,
            width: 140,
            ...args
        });
    }
}
export const activityGrid = elemFactory(ActivityGrid);