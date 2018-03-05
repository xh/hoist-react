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
                        usePortal: true
                    }
                }),
                hspacer(8),
                button({
                    icon: Icon.caretLeft(),
                    // onClick: this.onSubmitClick
                }),
                button({
                    icon: Icon.caretRight(),
                    // onClick: this.onSubmitClick
                }),
                button({
                    icon: Icon.arrowToRight(),
                    // onClick: this.onSubmitClick
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
                    // value: model.msg,
                    // onChange: this.onPatternChange
                }),
                hspacer(10),
                inputGroup({
                    placeholder: 'Device...',
                    // style: {width: 150},
                    // value: pattern,
                    // onChange: this.onPatternChange
                }),
                hspacer(10),
                inputGroup({
                    placeholder: 'Browser...',
                    // style: {width: 150},
                    // value: pattern,
                    // onChange: this.onPatternChange
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
                    icon: Icon.download()
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
        this.model.setStartDate(date); // might need to be a moment
        this.model.setFilter();

    }

    onEndDateChange = (date) => {
        this.model.setEndDate(date); // might need to be a moment
        this.model.setFilter();
    }

    onUsernameChange = (ev) => {
        const username = ev.target.value;
        this.model.setUsername(username);
    }

    onMsgChange = (ev) => {
        const msg = ev.target.value;
        this.model.setMsg(msg);
    }

    onSubmitClick = () => {
        this.model.setFilter();
    }

    renderLogCount() {
        const store = this.model.gridModel.store;
        return store.records.length + ' track logs'
    }
}
export const activityGridToolbar = elemFactory(ActivityGridToolbar);