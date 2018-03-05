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
        // const {} = this.model;

        return hbox({
            cls: 'xh-tbar',
            flex: 'none',
            padding: 3,
            alignItems: 'center',
            items: [
                hspacer(4),
                dateInput({
                    value: moment().toDate(),
                    formatDate: this.fmtDate,
                    parseDate: this.parseDate,
                    // onChange: this.onStartDateChange,
                    popoverProps: {
                        usePortal: true
                    }
                }),
                hspacer(8),
                Icon.angleRight(),
                hspacer(8),
                dateInput({
                    value: moment().toDate(),
                    formatDate: this.fmtDate,
                    parseDate: this.parseDate,
                    // onChange: this.onEndDateChange,
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
                    // style: {width: 150},
                    // value: pattern,
                    // onChange: this.onPatternChange
                }),
                hspacer(10),
                inputGroup({
                    placeholder: 'Msg...',
                    // style: {width: 150},
                    // value: pattern,
                    // onChange: this.onPatternChange
                }),
                hspacer(10),
                inputGroup({
                    placeholder: 'Category...',
                    // style: {width: 150},
                    // value: pattern,
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
                    // onClick: this.onSubmitClick
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
        return fmtDate(date)
    }

    parseDate(dateString) {
        return moment(dateString).toDate()
    }

    onSubmitClick = () => {
    };

    renderLogCount() {
        return '99 track logs'
    }
}
export const activityGridToolbar = elemFactory(ActivityGridToolbar);