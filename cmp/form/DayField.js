/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import moment from 'moment';
import {fmtDate} from 'hoist/format';
import {hoistComponent, elemFactory} from 'hoist/core';
import {dateInput} from 'hoist/kit/blueprint';

import {HoistField} from './HoistField';

/**
 * A Calendar Control for choosing a Day.
 *
 * @see HoistField for properties additional to those documented below.
 */
@hoistComponent()
export class DayField extends HoistField {

    static propTypes = {
        /** Position for calendar popover. @see http://blueprintjs.com/docs/v2/#core/components/popover.position */
        popoverPosition: PT.oneOf([
            'top-left', 'top', 'top-right',
            'right-top', 'right', 'right-bottom',
            'bottom-right', 'bottom', 'bottom-left',
            'left-bottom', 'left', 'left-top',
            'auto'
        ]),
    };

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
                position: popoverPosition || 'auto',
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