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
                this.dateInput({value: model.startDate, onChange: this.onStartDateChange}),
                hspacer(8),
                Icon.angleRight(),
                hspacer(8),
                this.dateInput({value: model.endDate, onChange: this.onEndDateChange}),
                hspacer(8),
                button({icon: Icon.caretLeft(), onClick: this.onDateGoBackClick}),
                button({icon: Icon.caretRight(), onClick: this.onDateGoForwardClick}),
                button({icon: Icon.arrowToRight(), onClick: this.onGoToCurrentDateClick}),
                hspacer(8),
                '|',
                hspacer(8),
                this.inputGroup({value: model.username, onChange: this.onUsernameChange, placeholder: 'User...'}),
                hspacer(10),
                this.inputGroup({value: model.msg, onChange: this.onMsgChange, placeholder: 'Msg...'}),
                hspacer(10),
                this.inputGroup({value: model.category, onChange: this.onCategoryChange, placeholder: 'Category...'}),
                hspacer(10),
                this.inputGroup({value: model.device, onChange: this.onDeviceChange, placeholder: 'Device...'}),
                hspacer(10),
                this.inputGroup({value: model.browser, onChange: this.onBrowserChange, placeholder: 'Browser...'}),
                hspacer(8),
                '|',
                hspacer(8),
                button({icon: Icon.sync(), onClick: this.onSubmitClick}),
                filler(),
                this.renderLogCount(),
                hspacer(8),
                button({icon: Icon.download(), onClick: this.onExportClick})
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
                position: 'bottom',
                popoverWillClose: this.onDatePopoverWillClose
            },
            dayPickerProps: {
                fixedWeeks: true
            },
            ...args
        });
    }

    inputGroup(args) {
        return inputGroup({
            style: {width: 140},
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
        this.model.setStartDate(date);
    }

    onEndDateChange = (date) => {
        this.model.setEndDate(date);
    }

    onDateGoBackClick = () => {
        this.model.adjustDates('subtract');
    }

    onDateGoForwardClick = () => {
        this.model.adjustDates('add');
    }

    onGoToCurrentDateClick = () => {
        this.model.adjustDates('subtract', true);
    }

    onUsernameChange = (ev) => {
        const username = ev.target.value;
        this.model.setUsername(username);
    }

    onMsgChange = (ev) => {
        const msg = ev.target.value;
        this.model.setMsg(msg);
    }

    onCategoryChange = (ev) => {
        const category = ev.target.value;
        this.model.setCategory(category);
    }

    onDeviceChange = (ev) => {
        const device = ev.target.value;
        this.model.setDevice(device);
    }

    onBrowserChange = (ev) => {
        const browser = ev.target.value;
        this.model.setBrowser(browser);
    }

    onDatePopoverWillClose = () => {
        this.model.loadAsync();
    }

    onSubmitClick = () => {
        this.model.loadAsync();
    }

    onExportClick = () => {
        this.model.exportGrid();
    }

    renderLogCount() {
        const store = this.model.gridModel.store;
        return store.records.length + ' track logs';
    }
}
export const activityGridToolbar = elemFactory(ActivityGridToolbar);