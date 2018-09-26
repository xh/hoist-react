/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import moment from 'moment';
import {assign, clone} from 'lodash';

import {fmtDate} from '@xh/hoist/format';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {dateInput as bpDateInput} from '@xh/hoist/kit/blueprint';
import {Ref} from '@xh/hoist/utils/react';
import {withDefault} from '@xh/hoist/utils/js';
import {HoistInput} from '@xh/hoist/cmp/form';

/**
 * A Calendar Control for choosing a Date.
 *
 * @see HoistInput for properties additional to those documented below.
 */
@HoistComponent
export class DateInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.string,

        /** true to commit on every key stroke, defaults false */
        commitOnChange: PT.bool,
        /** Position for calendar popover. @see http://blueprintjs.com/docs/ */
        popoverPosition: PT.oneOf([
            'top-left', 'top', 'top-right',
            'right-top', 'right', 'right-bottom',
            'bottom-right', 'bottom', 'bottom-left',
            'left-bottom', 'left', 'left-top',
            'auto'
        ]),
        /** Minimum (inclusive) valid date. */
        minDate: PT.instanceOf(Date),
        /** Maximum (inclusive) valid date. */
        maxDate: PT.instanceOf(Date),

        /**
         * MomentJS format of date for display and parsing.
         *
         * Defaults to YYYY-MM-DD HH:mm:ss, or a prefix of it, with presence of time components dependent on
         * the timePrecision prop.
         */
        formatString: PT.string,

        /**
         * The precision of time selection that accompanies the calendar.
         * If undefined, control will not show time.
         */
        timePrecision: PT.oneOf(['second', 'minute']),

        /**
         * Props passed to the TimePicker.  @see https://blueprintjs.com
         */
        timePickerProps: PT.object,

        /** Props passed to ReactDayPicker component. @see http://react-day-picker.js.org/ */
        dayPickerProps: PT.object,
        /** Icon to display on the left side of the field */
        leftIcon: PT.element,
        /** Element to display on the right side of the field */
        rightElement: PT.element
    };

    child = new Ref();

    baseClassName = 'xh-date-input';

    get commitOnChange() {
        withDefault(this.props.commitOnChange, false);
    }

    render() {
        const {props} = this,
            dayPickerProps = assign({fixedWeeks: true}, props.dayPickerProps),
            timePickerProps = timePrecision ? timePickerProps: undefined,
            popoverPosition = withDefault(props.popoverPosition, 'auto');

        return bpDateInput({
            className: this.getClassName(),
            ref: this.child.ref,
            value: this.renderValue,
            onChange: this.onChange,
            formatDate: this.formatDate,
            parseDate: this.parseDate,
            tabIndex: props.tabIndex,
            inputProps: {
                style: {...props.style, width: props.width},
                onKeyPress: this.onKeyPress,
                onFocus: this.onFocus,
                onBlur: this.onBlur,
                tabIndex: props.tabIndex,
                autoComplete: 'nope',
                leftIcon: props.leftIcon
            },
            popoverProps: {
                minimal: true,
                usePortal: true,
                position: popoverPosition,
                onClose: this.onPopoverWillClose
            },
            dayPickerProps,
            timePickerProps,
            timePrecision: props.timePrecision
            minDate: props.minDate,
            maxDate: props.maxDate,
            disabled: props.disabled,
            rightElement: props.rightElement
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
        return moment(dateString, this.getFormat()).toDate();
    }

    noteBlurred() {
        this.forcePopoverClose();
        super.noteBlurred();
    }

    onChange = (date, isUserChange) => {
        if (!isUserChange) return;
        const {minDate, maxDate} = this.props;

        if (date < minDate) date = minDate;
        if (date > maxDate) date = maxDate;


        date = this.applyPrecision(date);
        this.noteValueChange(date);
        this.forcePopoverClose();
    };

    onKeyPress = (ev) => {
        if (ev.key == 'Enter') this.doCommit();
    };

    onPopoverWillClose = (ev) => {
        this.doCommit();
    };

    forcePopoverClose() {
        this.child.value.setState({isOpen: false});
    }
}
export const dateInput = elemFactory(DateInput);
