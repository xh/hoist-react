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
import {vframe, filler, hbox, hspacer, div} from 'hoist/layout';
import {observable, action} from 'hoist/mobx';
import {fmtDate} from 'hoist/format';
import {Icon} from 'hoist/icon';

@hoistComponent()
export class VisitsChart extends Component {

    render() {
        return vframe(
            this.renderToolbar({model: this.model}),
            chart({model: this.model.chartModel})
        );
    }

    renderToolbar({model}) {
        return hbox({
            cls: 'xh-tbar',
            flex: 'none',
            padding: 4,
            alignItems: 'center',
            items: [
                hspacer(8),
                this.label('Unique Daily Visitors'),
                filler(),
                dateInput({
                    value: model.startDate,
                    formatDate: this.fmtDate,
                    parseDate: this.parseDate,
                    onChange: this.onStartDateChange,
                    inputProps: {
                        style: {width: 120}
                    },
                    popoverProps: {
                        minimal: true,
                        usePortal: true,
                        position: 'top'
                    }
                }),
                hspacer(10),
                dateInput({
                    value: model.endDate,
                    formatDate: this.fmtDate,
                    parseDate: this.parseDate,
                    onChange: this.onEndDateChange,
                    inputProps: {
                        style: {width: 120}
                    },
                    popoverProps: {
                        minimal: true,
                        usePortal: true,
                        position: 'top'
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

    fmtDate(date) {
        return fmtDate(date)
    }

    parseDate(dateString) {
        return moment(dateString).toDate()
    }

    onStartDateChange = (date) => {
        this.model.setStartDate(moment(date).toDate()); // why do I have to convert this to a moment and back out (not working if I don't)
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

    label(txt) {
        // Default label object has trouble with inline
        return div({
            cls: 'pt-label pt-inline',
            style: {whiteSpace: 'nowrap'},
            item: txt
        });
    }

}

export const visitsChart = elemFactory(VisitsChart);