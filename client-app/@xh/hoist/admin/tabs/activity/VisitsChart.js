/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import moment from 'moment';
import {button, inputGroup, dateInput} from 'hoist/kit/blueprint';
import {XH, hoistComponent, elemFactory} from 'hoist/core';
import {chart, ChartModel} from 'hoist/highcharts';
import {vframe, hbox, hspacer} from 'hoist/layout';
import {observable, action} from 'hoist/mobx';
import {fmtDate} from 'hoist/format';

@hoistComponent()
export class VisitsChart extends Component {

    render() {
        return vframe(
            this.renderToolbar({model: this.model}),
            chart({model: this.model.chartModel})
        );
    }

    // break out into chartToolBar component?
    renderToolbar({model}) {
        return hbox({
            cls: 'xh-tbar',
            items: [
                dateInput({
                    value: model.startDate,
                    formatDate: fmtDate,
                    parseDate: this.parseDate,
                    onChange: this.onStartDateChange,
                    popoverProps: {
                        usePortal: true
                    }
                }),
                hspacer(10),
                dateInput({
                    value: model.endDate,
                    formatDate: fmtDate,
                    parseDate: this.parseDate,
                    onChange: this.onEndDateChange,
                    popoverProps: {
                        usePortal: true
                    }
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

    parseDate(dateString) {
        return moment(dateString).toDate()
    }

    onStartDateChange = (date) => {
        this.model.setStartDate(moment(date).toDate());
    }

    onEndDateChange = (date) => {
        this.model.setEndDate(moment(date).toDate());
    }

    onUsernameChange = (ev) => {
        this.model.setUsername(ev.target.value);
    }

    onSubmitClick = () => {
        this.model.loadAsync();
    }

}

export const visitsChart = elemFactory(VisitsChart);