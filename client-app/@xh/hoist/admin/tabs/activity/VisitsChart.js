/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {button, inputGroup} from 'hoist/kit/blueprint';
import {XH, hoistComponent, elemFactory} from 'hoist/core';
import {chart, ChartModel} from 'hoist/highcharts';
import {vframe, hbox, hspacer} from 'hoist/layout';
import {observable, action} from 'hoist/mobx';

@hoistComponent()
export class VisitsChart extends Component {

    render() {
        return vframe(
            this.renderToolbar({model: this.model}),
            chart({model: this.model.chartModel})
        );
    }

    // make own component
    renderToolbar({model}) {
        return hbox({
            cls: 'xh-tbar',
            items: [
                inputGroup({ // turn into date field
                    value: model.startDate,
                    onChange: this.onStartDateChange
                }),
                hspacer(10),
                inputGroup({ // turn into date field
                    value: model.endDate,
                    onChange: this.onEndDateChange
                }),
                hspacer(10),
                inputGroup({
                    placeholder: 'Username',
                    value: model.username,
                    onChange: this.onUsernameChange
                }),
                hspacer(10),
                button({
                    text: 'Submit',
                    intent: 'success',
                    onClick: this.onSubmitClick
                })
            ]
        });
    }

    onStartDateChange = (ev) => {
        this.model.setStartDate(ev.target.value);
    }

    onEndDateChange = (ev) => {
        this.model.setEndDate(ev.target.value);
    }

    onUsernameChange = (ev) => {
        this.model.setUsername(ev.target.value);
    }

    onSubmitClick = () => {
        this.model.loadAsync();
    }

}

export const visitsChart = elemFactory(VisitsChart);