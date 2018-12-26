/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {wait} from '@xh/hoist/promise';
import PT from 'prop-types';
import moment from 'moment';
import {assign, clone} from 'lodash';

import {fmtDate} from '@xh/hoist/format';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {dateInput as bpDateInput} from '@xh/hoist/kit/blueprint';
import {Ref} from '@xh/hoist/utils/react';
import {withDefault} from '@xh/hoist/utils/js';
import {HoistInput} from '@xh/hoist/cmp/input';

/**
 * A Calendar Control for choosing a Date.
 *
 * By default this control emits dates with the time component cleared (set to midnight), but this
 * can be customized via the timePrecision prop to support editing of a date and time together.
 */
@HoistComponent
export class DateInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.instanceOf(Date),

        /** True to commit on every change/keystroke, default false. */
        commitOnChange: PT.bool,

        /** Props passed to ReactDayPicker component, as per DayPicker docs. */
        dayPickerProps: PT.object,

        /**
         * MomentJS format string for date display and parsing. Defaults to `YYYY-MM-DD HH:mm:ss`,
         * with default presence of time components determined by the timePrecision prop.
         */
        formatString: PT.string,

        /** Icon to display inline on the left side of the input. */
        leftIcon: PT.element,

        /** Maximum (inclusive) valid date. */
        maxDate: PT.instanceOf(Date),

        /** Minimum (inclusive) valid date. */
        minDate: PT.instanceOf(Date),

        /** Text to display when control is empty. */
        placeholder: PT.string,

        /** Position for calendar popover, as per Blueprint docs. */
        popoverPosition: PT.oneOf([
            'top-left', 'top', 'top-right',
            'right-top', 'right', 'right-bottom',
            'bottom-right', 'bottom', 'bottom-left',
            'left-bottom', 'left', 'left-top',
            'auto'
        ]),

        /** Element to display inline on the right side of the input */
        rightElement: PT.element,

        /** True to show a bar with Today + Clear buttons at bottom of date picker popover. */
        showActionsBar: PT.bool,

        /** Alignment of entry text within control, default 'left'. */
        textAlign: PT.oneOf(['left', 'right']),

        /** Props passed to the TimePicker, as per Blueprint docs. */
        timePickerProps: PT.object,

        /**
         * The precision of time selection that accompanies the calendar.
         * If undefined, control will not show time.
         */
        timePrecision: PT.oneOf(['second', 'minute']),

        /** Width of the control in pixels. */
        width: PT.number
    };

    bpRef = new Ref();
    popoverRef = new Ref();

    baseClassName = 'xh-date-input';

    get commitOnChange() {
        return withDefault(this.props.commitOnChange, false);
    }

    render() {
        const {props} = this;

        return bpDateInput({
            value: this.renderValue,
            ref: this.bpRef.ref,

            formatDate: this.formatDate,
            parseDate: this.parseDate,

            canClearSelection: false,   // just disables clearing when re-clicking same date
            dayPickerProps: assign({fixedWeeks: true}, props.dayPickerProps),
            disabled: props.disabled,
            inputProps: {
                autoComplete: 'nope',
                leftIcon: props.leftIcon,
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
            // See Hoist #757. Blueprint setting arbitrary, narrrower limits without these
            maxDate: props.maxDate || moment().add(100, 'years').toDate(),
            minDate: props.minDate || moment().subtract(100, 'years').toDate(),
            placeholder: props.placeholder,
            popoverProps: {
                minimal: true,
                usePortal: true,
                popoverRef: this.popoverRef.ref,
                position: withDefault(props.popoverPosition, 'auto'),
                onClose: this.onPopoverWillClose
            },
            rightElement: props.rightElement,
            showActionsBar: props.showActionsBar,
            tabIndex: props.tabIndex,
            timePickerProps: props.timePrecision ? props.timePickerProps : undefined,
            timePrecision: props.timePrecision,

            className: this.getClassName(),

            onChange: this.onChange
        });
    }

    // Custom blur handler to account for focus potentially living in either input or popover.
    // We want to call noteBlurred when focus has left both. Extra long delay here working around
    // some kind of transition that happens when you use popover buttons to navigate between months.
    // Focus appears to flap to focus for a tick, then back to the popover.... For review....
    onBlur = () => {
        wait(800).then(() => {
            const activeEl = document.activeElement,
                popoverEl = this.popoverRef.value,
                popoverHasFocus = popoverEl && popoverEl.contains(activeEl);

            if (!popoverHasFocus && !this.containsElement(activeEl)) {
                this.noteBlurred();
            }
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

    noteBlurred() {
        this.forcePopoverClose();
        super.noteBlurred();
    }

    onChange = (date, isUserChange) => {
        if (!isUserChange) return;

        if (date) {
            const {minDate, maxDate} = this.props;
            if (minDate && date < minDate) date = minDate;
            if (maxDate && date > maxDate) date = maxDate;
            date = this.applyPrecision(date);
        }

        this.noteValueChange(date);
        this.forcePopoverClose();
    };

    onKeyPress = (ev) => {
        if (ev.key == 'Enter') this.doCommit();
    };

    onPopoverWillClose = () => {
        this.doCommit();
    };

    forcePopoverClose() {
        this.bpRef.value.setState({isOpen: false});
    }
    
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
export const dateInput = elemFactory(DateInput);
