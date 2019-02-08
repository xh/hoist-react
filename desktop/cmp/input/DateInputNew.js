/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import moment from 'moment';
import {clone} from 'lodash';

import {fmtDate} from '@xh/hoist/format';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {dateTimePicker} from '@xh/hoist/kit/react-widgets';
import {withDefault} from '@xh/hoist/utils/js';
import {HoistInput} from '@xh/hoist/cmp/input';

/**
 * A Calendar Control for choosing a Date.
 *
 * By default this control emits dates with the time component cleared (set to midnight), but this
 * can be customized via the timePrecision prop to support editing of a date and time together.
 */
@HoistComponent
export class DateInputNew extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.instanceOf(Date),

        /** True to commit on every change/keystroke, default false. */
        commitOnChange: PT.bool,

        /**
         * MomentJS format string for date display and parsing. Defaults to `YYYY-MM-DD HH:mm:ss`,
         * with default presence of time components determined by the timePrecision prop.
         */
        formatString: PT.string,

        /** Maximum (inclusive) valid date. */
        maxDate: PT.instanceOf(Date),

        /** Minimum (inclusive) valid date. */
        minDate: PT.instanceOf(Date),

        /** Text to display when control is empty. */
        placeholder: PT.string,

        /** Alignment of entry text within control, default 'left'. */
        textAlign: PT.oneOf(['left', 'right']),

        /** Width of the control in pixels. */
        width: PT.number,

        /** Upward opening direction of the DateTimePicker popup */
        dropUp: PT.bool

    };

    baseClassName = 'xh-date-input';

    get commitOnChange() {
        return withDefault(this.props.commitOnChange, false);
    }

    render() {
        const {props} = this;

        return dateTimePicker({
            value: this.renderValue,

            disabled: props.disabled,
            dropUp: props.dropUp,
            inputProps: {
                autoComplete: 'nope',
                tabIndex: props.tabIndex,

                style: {
                    ...props.style,
                    textAlign: withDefault(props.textAlign, 'left'),
                    width: props.width
                },

                onBlur: this.onBlur,
                onFocus: this.onFocus,
                onKeyPress: this.onKeyPress
            },
            max: props.maxDate,
            min: props.minDate,
            placeholder: props.placeholder,
            tabIndex: props.tabIndex,
            parse: this.parseDate,

            className: this.getClassName(),

            onChange: this.onChange
        });
    }

    getFormat() {
        const {formatString, timePrecision} = this.props;
        if (formatString) return formatString;
        let ret = 'YYYY-MM-DD';
        if (timePrecision == 'minute') {
            ret += ' HH:mm';
        } else if (timePrecision == 'second') {
            ret += ' HH:mm:ss';
        }
        return ret;
    }

    formatDate = (date) => {
        return fmtDate(date, {fmt: this.getFormat()});
    }

    parseDate = (dateString) => {
        // Handle 'invalid date'  as null.
        const ret = moment(dateString, this.getFormat()).toDate();
        return isNaN(ret) ? null : ret;
    }

    onChange = (date) => {
        if (date) {
            const {minDate, maxDate} = this.props;
            if (minDate && date < minDate) date = minDate;
            if (maxDate && date > maxDate) date = maxDate;
            date = this.applyPrecision(date);
        }

        this.noteValueChange(date);
    };

    onKeyPress = (ev) => {
        if (ev.key == 'Enter') this.doCommit();
    };

    applyPrecision(date)  {
        let {timePrecision} = this.props;
        date = clone(date);
        if (timePrecision == 'second') {
            date.setMilliseconds(0);
        } else if (timePrecision == 'minute') {
            date.setSeconds(0, 0);
        } else {
            date.setHours(0, 0, 0, 0);
        }
        return date;
    }
}
export const dateInputNew = elemFactory(DateInputNew);
