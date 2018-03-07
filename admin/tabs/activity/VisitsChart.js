/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import moment from 'moment';
import {button, inputGroup, dateInput} from 'hoist/kit/blueprint';
import {hoistComponent, elemFactory} from 'hoist/core';
import {chart} from 'hoist/highcharts';
import {vframe, filler, hbox, hspacer, div} from 'hoist/layout';
import {Icon} from 'hoist/icon';
import {fmtDate} from 'hoist/format';

@hoistComponent()
export class VisitsChart extends Component {

    render() {
        return vframe(
            this.renderToolbar({model: this.model}),
            chart({model: this.model.chartModel})
        );
    }

    //----------------
    // Implementation
    //----------------
    renderToolbar({model}) {
        return hbox({
            cls: 'xh-tbar',
            flex: 'none',
            padding: 4,
            alignItems: 'center',
            items: [
                hspacer(4),
                Icon.users(),
                hspacer(4),
                this.label('Unique Daily Visitors'),
                filler(),
                this.dateInput({value: model.startDate, onChange: this.onStartDateChange}),
                hspacer(8),
                Icon.angleRight(),
                hspacer(8),
                this.dateInput({value: model.endDate, onChange: this.onEndDateChange}),
                hspacer(10),
                inputGroup({
                    placeholder: 'Username',
                    value: model.username,
                    onChange: this.onUsernameChange
                }),
                hspacer(10),
                button({
                    icon: Icon.sync(),
                    onClick: this.onSubmitClick
                })
            ]
        });
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    dateInput(args) {
        return dateInput({
            formatDate: this.formatDate,
            parseDate: this.parseDate,
            inputProps: {style: {width: 120}},
            popoverProps: {
                minimal: true,
                usePortal: true,
                position: 'top',
                popoverWillClose: this.onDatePopoverWillClose
            },
            dayPickerProps: {
                fixedWeeks: true
            },
            ...args
        });
    }

    formatDate(date) {
        return fmtDate(date);
    }

    parseDate(dateString) {
        return moment(dateString).toDate();
    }

    onStartDateChange = (date) => {
        this.model.setStartDate(moment(date).toDate());
    }

    onEndDateChange = (date) => {
        this.model.setEndDate(moment(date).toDate());
    }

    onDatePopoverWillClose = () => {
        this.model.loadAsync();
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