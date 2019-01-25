/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {dateInputNew, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {refreshButton} from '@xh/hoist/desktop/cmp/button';
import {chart} from '@xh/hoist/desktop/cmp/chart';
import {Icon} from '@xh/hoist/icon';

@HoistComponent
export class VisitsChart extends Component {
    
    render() {
        const {model} = this;
        return panel({
            mask: model.loadModel,
            icon: Icon.users(),
            title: 'Unique Daily Visitors',
            item: chart({model: model.chartModel}),
            bbar: this.renderToolbar(),
            model: {
                defaultSize: 500,
                side: 'bottom',
                prefName: 'xhAdminActivityChartSize'
            }
        });
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    renderToolbar() {
        const model = this.model;
        return toolbar(
            this.dateInput({bind: 'startDate'}),
            Icon.angleRight(),
            this.dateInput({bind: 'endDate'}),
            textInput({
                model,
                bind: 'username',
                placeholder: 'Username',
                onCommit: this.onCommit,
                width: 120
            }),
            refreshButton({model})
        );
    }

    dateInput(args) {
        return dateInputNew({
            model: this.model,
            onCommit: this.onCommit,
            popoverPosition: 'top-left',
            commitOnChange: true,
            width: 100,
            ...args
        });
    }

    onCommit = () => {
        this.model.loadAsync();
    }
}

export const visitsChart = elemFactory(VisitsChart);