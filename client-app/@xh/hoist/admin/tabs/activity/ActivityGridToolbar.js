/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import moment from 'moment';
import {elemFactory, hoistComponent} from 'hoist/core';
import {inputGroup, dateInput, button} from 'hoist/kit/blueprint';
import {hbox, filler, hspacer} from 'hoist/layout';
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
                dateInput({
                    value: moment().toDate(),
                    formatDate: this.fmtDate,
                    parseDate: this.parseDate,
                    // onChange: this.onEndDateChange,
                    popoverProps: {
                        usePortal: true
                    }
                }),
                // hspacer(10),
                // inputGroup({
                //     placeholder: 'Search...',
                //     style: {width: 150},
                //     value: pattern,
                //     onChange: this.onPatternChange
                // }),
                // hspacer(10),
                // checkbox({
                //     name: 'tail',
                //     style: {marginBottom: '0px', marginRight: '0px'},
                //     label: this.label('Tail'),
                //     checked: tail,
                //     inline: true,
                //     onChange: this.onTailChange
                // }),
                filler(),
                button({
                    icon: 'refresh',
                    // onClick: this.onSubmitClick
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
}
export const activityGridToolbar = elemFactory(ActivityGridToolbar);