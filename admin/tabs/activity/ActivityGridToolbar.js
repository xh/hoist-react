/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import moment from 'moment';
import {elemFactory, hoistComponent} from 'hoist/core';
import {button, dateInput, inputGroup} from 'hoist/kit/blueprint';
import {hbox, filler, hspacer} from 'hoist/layout';
import {Icon} from 'hoist/icon';
import {fmtDate} from 'hoist/format';

@hoistComponent()
export class ActivityGridToolbar extends Component {

    render() {
        const model = this.model;

        return hbox({
            cls: 'xh-tbar',
            flex: 'none',
            padding: 3,
            alignItems: 'center',
            items: [
                hspacer(4),
                dateInput({
                    value: model.startDate,
                    formatDate: this.formatDate,
                    parseDate: this.parseDate,
                    onChange: this.onStartDateChange,
                    inputProps: {style: {width: 120}},
                    popoverProps: {
                        minimal: true,
                        usePortal: true,
                        position: 'bottom',
                        popoverWillClose: this.onPopoverWillClose
                    }
                }),
                hspacer(8),
                Icon.angleRight(),
                hspacer(8),
                dateInput({
                    value: model.endDate,
                    formatDate: this.formatDate,
                    parseDate: this.parseDate,
                    onChange: this.onEndDateChange,
                    inputProps: {style: {width: 120}},
                    popoverProps: {
                        minimal: true,
                        usePortal: true,
                        position: 'bottom',
                        popoverWillClose: this.onPopoverWillClose
                    }
                }),
                hspacer(8),
                button({
                    icon: Icon.caretLeft(),
                    onClick: this.onDateGoBackClick
                }),
                button({
                    icon: Icon.caretRight(),
                    onClick: this.onDateGoForwardClick
                }),
                button({
                    icon: Icon.arrowToRight(),
                    onClick: this.onGoToCurrentDateClick
                }),
                hspacer(8),
                '|',
                hspacer(8),
                inputGroup({
                    placeholder: 'User...',
                    value: model.username,
                    style: {width: 140},
                    onChange: this.onUsernameChange
                }),
                hspacer(10),
                inputGroup({
                    placeholder: 'Msg...',
                    value: model.msg,
                    style: {width: 140},
                    onChange: this.onMsgChange
                }),
                hspacer(10),
                inputGroup({
                    placeholder: 'Category...',
                    value: model.category,
                    style: {width: 140},
                    onChange: this.onCategoryChange
                }),
                hspacer(10),
                inputGroup({
                    placeholder: 'Device...',
                    value: model.device,
                    style: {width: 140},
                    onChange: this.onDeviceChange
                }),
                hspacer(10),
                inputGroup({
                    placeholder: 'Browser...',
                    value: model.browser,
                    style: {width: 140},
                    onChange: this.onBrowserChange
                }),
                hspacer(8),
                '|',
                hspacer(8),
                button({
                    icon: Icon.sync(),
                    onClick: this.onSubmitClick
                }),
                filler(),
                this.renderLogCount(),
                hspacer(8),
                button({
                    icon: Icon.download(),
                    onClick: this.onExportClick
                })
            ]
        });
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    formatDate(date) {
        return fmtDate(date);
    }

    parseDate(dateString) {
        return moment(dateString).toDate();
    }

    onStartDateChange = (date) => {
        this.model.setStartDate(date);

    }

    onEndDateChange = (date) => {
        this.model.setEndDate(date);
    }

    onDateGoBackClick = () => {
        this.adjustDates('subtract')
    }

    onDateGoForwardClick = () => {
        this.adjustDates('add')
    }

    onGoToCurrentDateClick = () => {
        this.adjustDates('subtract', true)
    }

    onUsernameChange = (ev) => {
        const username = ev.target.value.toLowerCase();
        this.model.setUsername(username);
    }

    onMsgChange = (ev) => {
        const msg = ev.target.value.toLowerCase();
        this.model.setMsg(msg);
    }

    onCategoryChange = (ev) => {
        const category = ev.target.value.toLowerCase();
        this.model.setCategory(category);
    }

    onDeviceChange = (ev) => {
        const device = ev.target.value.toLowerCase();
        this.model.setDevice(device);
    }

    onBrowserChange = (ev) => {
        const browser = ev.target.value.toLowerCase();
        this.model.setBrowser(browser);
    }

    onPopoverWillClose = () => {
        this.model.loadAsync();  // can we/do we want to confirm a change here first
    }

    onSubmitClick = () => {
        this.model.loadAsync();
    }

    onExportClick = () => {
        const model = this.model,
            gridModel = model.gridModel,
            fileName = `Track logs ${fmtDate(model.startDate)} to ${fmtDate(model.endDate)}`;

        gridModel.exportDataAsExcel({fileName});
    }

    adjustDates(dir, toToday = false) {
        const model = this.model,
            today = moment(),
            start = moment(model.startDate),
            end = moment(model.endDate),
            diff = end.diff(start, 'days'),
            incr = diff + 1;

        let newStart = start[dir](incr, 'days'),
            newEnd = end[dir](incr, 'days');

        if (newEnd.diff(today, 'days') > 0 || toToday) {
            newStart = today.clone().subtract(diff, 'days');
            newEnd = today;
        }

        model.setStartDate(newStart.toDate());
        model.setEndDate(newEnd.toDate());
        this.model.setFilter();
    }

    renderLogCount() {
        const store = this.model.gridModel.store;
        return store.records.length + ' track logs'
    }
}
export const activityGridToolbar = elemFactory(ActivityGridToolbar);