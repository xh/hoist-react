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
                    formatDate: this.fmtDate,
                    parseDate: this.parseDate,
                    onChange: this.onStartDateChange,
                    popoverProps: {
                        minimal: true,
                        usePortal: true
                    }
                }),
                hspacer(8),
                Icon.angleRight(),
                hspacer(8),
                dateInput({
                    value: model.endDate,
                    formatDate: this.fmtDate,
                    parseDate: this.parseDate,
                    onChange: this.onEndDateChange,
                    popoverProps: {
                        minimal: true,
                        usePortal: true
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
                    onChange: this.onUsernameChange
                }),
                hspacer(10),
                inputGroup({
                    placeholder: 'Msg...',
                    value: model.msg,
                    onChange: this.onMsgChange
                }),
                hspacer(10),
                inputGroup({
                    placeholder: 'Category...',
                    value: model.category,
                    onChange: this.onCategoryChange
                }),
                hspacer(10),
                inputGroup({
                    placeholder: 'Device...',
                    value: model.device,
                    onChange: this.onDeviceChange
                }),
                hspacer(10),
                inputGroup({
                    placeholder: 'Browser...',
                    value: model.browser,
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
    fmtDate(date) {
        return fmtDate(date);
    }

    parseDate(dateString) {
        return moment(dateString).toDate();
    }

    onStartDateChange = (date) => {
        this.model.setStartDate(date);
        this.model.setFilter();

    }

    onEndDateChange = (date) => {
        this.model.setEndDate(date);
        this.model.setFilter();
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

    onSubmitClick = () => {
        this.model.setFilter();
    }

    onExportClick = () => {
        const model = this.model,
            gridModel = model.gridModel,
            fileName = `Track logs ${fmtDate(model.startDate)} to ${fmtDate(model.endDate)}`;

        gridModel.exportDataAsExcel({fileName: fileName});
    }

    adjustDates(dir, toToday = false) {
        const model = this.model,
            start = moment(model.startDate),
            end = moment(model.endDate),
            diff = end.diff(start, 'days'),
            incr = diff + 1;

        let newStart = start[dir](incr, 'days'),
            newEnd = end[dir](incr, 'days');

        if (newEnd.diff(moment(), 'days') > 0 || toToday) {
            newStart = moment().subtract(diff, 'days');
            newEnd = moment();
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