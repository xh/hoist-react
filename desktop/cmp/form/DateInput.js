/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import moment from 'moment';
import {assign} from 'lodash';

import {fmtDate} from '@xh/hoist/format';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {dateInput as bpDateInput} from '@xh/hoist/kit/blueprint';
import {Ref} from '@xh/hoist/utils/react';

import {HoistInput} from '@xh/hoist/cmp/form';

/**
 * A Calendar Control for choosing a Day.
 *
 * @see HoistInput for properties additional to those documented below.
 */
@HoistComponent
export class DateInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,

        /** Value of the control */
        value: PT.string,

        /** Position for calendar popover. @see http://blueprintjs.com/docs/ */
        popoverPosition: PT.oneOf([
            'top-left', 'top', 'top-right',
            'right-top', 'right', 'right-bottom',
            'bottom-right', 'bottom', 'bottom-left',
            'left-bottom', 'left', 'left-top',
            'auto'
        ]),

        minDate: PT.instanceOf(Date),
        maxDate: PT.instanceOf(Date),

        /** Props passed to ReactDayPicker component. @see http://react-day-picker.js.org/ */
        dayPickerProps: PT.object,
        /** Icon to display on the left side of the field */
        leftIcon: PT.element,
        /** Element to display on the right side of the field */
        rightElement: PT.element
    };

    child = new Ref();

    delegateProps = ['className', 'disabled', 'rightElement'];

    baseClassName = 'xh-date-input';

    render() {
        let {minDate, maxDate, width, popoverPosition, style, dayPickerProps, leftIcon} = this.props;

        dayPickerProps = assign({fixedWeeks: true}, dayPickerProps);

        return bpDateInput({
            className: this.getClassName(),
            ref: this.child.ref,
            value: this.renderValue,
            onChange: this.onChange,
            formatDate: this.formatDate,
            parseDate: this.parseDate,
            inputProps: {
                style: {...style, width},
                onKeyPress: this.onKeyPress,
                onBlur: this.onBlur,
                onFocus: this.onFocus,
                autoComplete: 'nope',
                leftIcon
            },
            popoverProps: {
                minimal: true,
                usePortal: true,
                position: popoverPosition || 'auto',
                onClose: this.onPopoverWillClose
            },
            minDate,
            maxDate,
            dayPickerProps,
            ...this.getDelegateProps()
        });
    }

    formatDate(date) {
        return fmtDate(date);
    }

    parseDate(dateString) {
        return moment(dateString, 'YYYY-MM-DD', true).toDate();
    }

    onChange = (date, isUserChange) => {
        if (!isUserChange) return;
        const {minDate, maxDate} = this.props;

        if (date < minDate) date = minDate;
        if (date > maxDate) date = maxDate;

        this.noteValueChange(date);

        // Blueprint won't always close popover (e.g. choosing a date in previous month). Force it to.
        this.child.value.setState({isOpen: false});
    }

    onKeyPress = (ev) => {
        if (ev.key == 'Enter') this.doCommit();
    }

    onPopoverWillClose = (ev) => {
        this.doCommit();
    }

    onBlur = () => {
        this.noteBlurred();
    }

    onFocus = () => {
        this.noteFocused();
    }

}

export const dateInput = elemFactory(DateInput);
