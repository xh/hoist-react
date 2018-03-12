/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {Component} from 'react';
import moment from 'moment';
import {fmtDate} from 'hoist/format';
import {hoistComponent, elemFactory} from 'hoist/core';
import {dateInput} from 'hoist/kit/blueprint';

import {bindableField} from './BindableField';


/**
 * A calendar control for choosing a date
 *
 * @prop value, date
 * @prop onChange, handler to fire when value changes
 * @prop model, model to bind to
 * @prop field, name of property in model to bind to
 * @prop disabled, is control disabled
 * @prop style
 * @prop className
 *
 * @prop width, width of field
 * @prop onCommit, handler to call when enter or tab pressed, or popover closed
 * @prop popoverPosition, 'top' | 'bottom' |  'auto' (auto determined),
 */
@bindableField
@hoistComponent()
export class DayField extends Component {

    static defaultProps = {
        popoverPosition: 'auto'
    }

    delegateProps = ['className', 'disabled']

    render() {
        const {width, onCommit, popoverPosition, style} = this.props;

        return dateInput({
            value: this.readValue(),
            onChange: this.onChange,
            formatDate: this.formatDate,
            parseDate: this.parseDate,
            inputProps: {style: {...style, width}},
            popoverProps: {
                minimal: true,
                usePortal: true,
                position: popoverPosition,
                popoverWillClose: onCommit
            },
            dayPickerProps: {fixedWeeks: true},
            ...this.getDelegateProps()
        });
    }

    formatDate(date) {
        return fmtDate(date);
    }

    parseDate(dateString) {
        return moment(dateString).toDate();
    }

    onChange = (date) => {
        this.noteValueChange(date);
    }
}
export const dayField = elemFactory(DayField);