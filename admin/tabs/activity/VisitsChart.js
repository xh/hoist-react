/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {button} from 'hoist/kit/blueprint';
import {textField, dayField, label, toolbar} from 'hoist/cmp';
import {hoistComponent, elemFactory} from 'hoist/core';
import {chart} from 'hoist/highcharts';
import {vframe, filler} from 'hoist/layout';
import {Icon} from 'hoist/icon';

@hoistComponent()
export class VisitsChart extends Component {

    renderCollapsed() {
        return toolbar(Icon.users(), label('Unique Daily Visitors'));
    }

    render() {
        return vframe(
            this.renderToolbar(),
            chart({model: this.model.chartModel})
        );
    }
    
    renderToolbar() {
        const model = this.model;
        return toolbar(
            Icon.users(),
            label('Unique Daily Visitors'),
            filler(),
            this.dayField({field: 'startDate'}),
            Icon.angleRight(),
            this.dayField({field: 'endDate'}),
            textField({
                model,
                field: 'username',
                placeholder: 'Username',
                onCommit: this.onCommit,
                width: 120
            }),
            button({icon: Icon.sync(), onClick: this.onSubmitClick})
        );
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    dayField(args) {
        return dayField({
            model: this.model,
            onCommit: this.onCommit,
            popoverPosition: 'top',
            width: 100,
            ...args
        });
    }

    onCommit = () => {
        this.model.loadAsync();
    }

    onSubmitClick = () => {
        this.model.loadAsync();
    }
}

export const visitsChart = elemFactory(VisitsChart);