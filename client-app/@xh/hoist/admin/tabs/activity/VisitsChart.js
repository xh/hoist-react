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
import {vframe, hbox} from 'hoist/layout';
import {observable, action} from 'hoist/mobx';

@hoistComponent()
export class VisitsChart extends Component {

    render() {
        return vframe(
            this.renderToolbar({model: this.visitsModel}),
            chart({model: this.model.chartModel})
        );
    }

    renderToolbar({model}) {
        return hbox(
                inputGroup({
                    value: this.model.startDate,
                    onChange: this.onStartDateChange
                }),
                inputGroup({
                    value: this.model.endDate,
                    onChange: this.onEndDateChange
                }),
                button({
                    text: 'Submit',
                    intent: 'success',
                    onClick: this.onSubmitClick
                })
        );
    }

    onStartDateChange = (ev) => {
        this.model.setStartDate(ev.target.value);
    }

    onEndDateChange = (ev) => {
        this.model.setEndDate(ev.target.value);
    }

    onSubmitClick = () => {
        this.model.loadAsync();
    }

}

export const visitsChart = elemFactory(VisitsChart);