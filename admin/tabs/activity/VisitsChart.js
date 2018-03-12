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
                this.dayField({field: 'startDate'}),
                hspacer(8),
                Icon.angleRight(),
                hspacer(8),
                this.dayField({field: 'endDate'}),
                hspacer(10),
                textField({
                    model,
                    field: 'username', 
                    placeholder: 'Username',
                    width: 140
                }),
                hspacer(10),
                button({icon: Icon.sync(), onClick: this.onSubmitClick})
            ]
        });
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    dayField(args) {
        return dayField({
            model: this.model,
            onCommit: this.onDateCommit,
            popoverPosition: 'top',
            width: 100,
            ...args
        });
    }

    onDateCommit = () => {
        this.model.loadAsync();
    }

    onSubmitClick = () => {
        this.model.loadAsync();
    }
}

export const visitsChart = elemFactory(VisitsChart);