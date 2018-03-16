/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import moment from 'moment';
import {fmtDate} from 'hoist/format';
import {hoistComponent, elemFactory} from 'hoist/core';
import {dateInput} from 'hoist/kit/blueprint';

import {HoistField} from './HoistField';


/**
 * A Calendar Control for choosing a Day.
 *
 * @prop rest, see properties for HoistField
 *
 * @prop width, width of field
 * @prop popoverPosition, 'top' | 'bottom' |  'auto' (auto determined),
 */
@hoistComponent()
export class DayField extends HoistField {

    static defaultProps = {
        popoverPosition: 'auto'
    }

    delegateProps = ['className', 'disabled']

    render() {
        const {width, popoverPosition, style} = this.props;

        return dateInput({
            value: this.renderValue,
            onChange: this.onChange,
            formatDate: this.formatDate,
            parseDate: this.parseDate,
            inputProps: {
                style: {...style, width},
                onKeyPress: this.onKeyPress,
                onBlur: this.onBlur,
                onFocus: this.onFocus
            },
            popoverProps: {
                minimal: true,
                usePortal: true,
                position: popoverPosition,
                popoverWillClose: this.onPopoverWillClose
            },
            dayPickerProps: {fixedWeeks: true},
            ...this.getDelegateProps()
        });
    }

    formatDate(date) {
        return fmtDate(date);
    }

    parseDate(dateString) {
        return moment(dateString, 'YYYY-MM-DD', true).toDate();
    }

    onChange = (date) => {
        this.noteValueChange(date);
    }

    onKeyPress = (ev) => {
        if (ev.key == 'Enter') this.doCommit();
    }

    onPopoverWillClose = (ev) => {
        this.doCommit();
    }
}
export const dayField = elemFactory(DayField);