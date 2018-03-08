/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {button} from 'hoist/kit/blueprint';
import {textField, dayField, label} from 'hoist/cmp';
import {hoistComponent, elemFactory} from 'hoist/core';
import {chart} from 'hoist/highcharts';
import {vframe, filler, hbox, hspacer} from 'hoist/layout';
import {Icon} from 'hoist/icon';

@hoistComponent()
export class VisitsChart extends Component {

    render() {
        return vframe(
            this.renderToolbar(),
            chart({model: this.model.chartModel})
        );
    }
    
    renderToolbar() {
        const model = this.model;
        return hbox({
            cls: 'xh-tbar',
            flex: 'none',
            padding: 4,
            alignItems: 'center',
            items: [
                hspacer(4),
                Icon.users(),
                hspacer(4),
                label('Unique Daily Visitors'),
                filler(),
                dayField({model, field: 'startDate', popoverPosition: 'top', onCommit: this.onDateCommit}),
                hspacer(8),
                Icon.angleRight(),
                hspacer(8),
                dayField({model, field: 'endDate', popoverPosition: 'top', onCommit: this.onDateCommit}),
                hspacer(10),
                textField({model, field: 'username', placeholder: 'Username'}),
                hspacer(10),
                button({icon: Icon.sync(), onClick: this.onSubmitClick})
            ]
        });
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    onDateCommit = () => {
        this.model.loadAsync();
    }

    onSubmitClick = () => {
        this.model.loadAsync();
    }
}

export const visitsChart = elemFactory(VisitsChart);