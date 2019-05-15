/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {wait} from '@xh/hoist/promise';
import PT from 'prop-types';
import moment from 'moment';
import {assign, clone} from 'lodash';

import {fmtDate} from '@xh/hoist/format';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {datePicker as bpDatePicker, popover} from '@xh/hoist/kit/blueprint';
import {div} from '@xh/hoist/cmp/layout';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {Ref} from '@xh/hoist/utils/react';
import {withDefault} from '@xh/hoist/utils/js';
import {bindable} from '@xh/hoist/mobx';
import {HoistInput} from '@xh/hoist/cmp/input';

/**
 * A Calendar Control for choosing a Date.
 *
 * By default this control emits dates with the time component cleared (set to midnight), but this
 * can be customized via the timePrecision prop to support editing of a date and time together.
 *
 * The calendar popover can be opened via the built-in button or up/down arrow keyboard shortcuts.
 */
@HoistComponent
@LayoutSupport
export class DateInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.instanceOf(Date),

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
        timePrecision: PT.oneOf(['second', 'minute'])
    };

    @bindable popoverOpen = false;

    popoverRef = new Ref();
    baseClassName = 'xh-date-input';

    // Prop-backed convenience getters
    get maxDate() {return this.props.maxDate || moment().add(100, 'years').toDate()}
    get minDate() {return this.props.minDate || moment().subtract(100, 'years').toDate()}

    render() {
        const props = this.getNonLayoutProps(),
            layoutProps = this.getLayoutProps();

        return div({
            item: popover({
                isOpen: this.popoverOpen && !this.props.disabled,
                minimal: true,
                usePortal: true,
                enforceFocus: false,
                position: withDefault(props.popoverPosition, 'auto'),
                popoverRef: this.popoverRef.ref,
                onClose: this.onPopoverClose,

                content: bpDatePicker({
                    value: this.renderValue,
                    onChange: this.onDatePickerChange,
                    maxDate: this.maxDate,
                    minDate: this.minDate,
                    showActionsBar: props.showActionsBar,
                    dayPickerProps: assign({fixedWeeks: true}, props.dayPickerProps),
                    timePickerProps: props.timePrecision ? props.timePickerProps : undefined,
                    timePrecision: props.timePrecision
                }),

                item: textInput({
                    value: this.formatDate(this.renderValue),
                    className: this.getClassName(),
                    onCommit: this.onInputCommit,
                    rightElement: button({
                        icon: Icon.calendar(),
                        tabIndex: -1, // Prevent focus on tab
                        onClick: this.onPopoverBtnClick
                    }),

                    disabled: props.disabled,
                    leftIcon: props.leftIcon,
                    tabIndex: props.tabIndex,
                    placeholder: props.placeholder,
                    textAlign: props.textAlign,

                    ...layoutProps
                })
            }),

            onBlur: this.onBlur,
            onFocus: this.onFocus,
            onKeyDown: this.onKeyDown
        });
    }

    /**
     * Custom blur handler to account for focus potentially living in either input or popover.
     * We want to call noteBlurred when focus has left both. Extra long delay here working around
     * some kind of transition that happens when you use popover buttons to navigate between months.
     * Focus appears to flap to focus for a tick, then back to the popover.... For review....
     */
    onBlur = () => {
        wait(800).then(() => {
            const activeEl = document.activeElement,
                popoverEl = this.popoverRef.value,
                popoverHasFocus = popoverEl && popoverEl.contains(activeEl),
                inputHasFocus = this.containsElement(activeEl);

            if (!popoverHasFocus && !inputHasFocus) {
                this.noteBlurred();
            }
        });
    };

    noteBlurred() {
        this.setPopoverOpen(false);
        super.noteBlurred();
    }

    onPopoverBtnClick = () => {
        this.setPopoverOpen(!this.popoverOpen);
    };

    onKeyDown = (ev) => {
        if (ev.key == 'Enter') {
            this.doCommit();
        }
        if (!this.popoverOpen && ['ArrowUp', 'ArrowDown'].includes(ev.key)) {
            this.setPopoverOpen(true);
        }
    };

    onPopoverClose = () => {
        this.doCommit();
    };
    
    onInputCommit = (value) => {
        const date = this.parseDate(value);
        this.onDateChange(date);
    };

    onDatePickerChange = (date, isUserChange) => {
        if (!isUserChange) return;
        this.onDateChange(date);
    };

    onDateChange = (date) => {
        if (date) {
            const {minDate, maxDate} = this;
            if (minDate && date < minDate) date = minDate;
            if (maxDate && date > maxDate) date = maxDate;
            date = this.applyPrecision(date);
        }

        this.noteValueChange(date);
        this.setPopoverOpen(false);
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

    formatDate(date) {
        return fmtDate(date, {fmt: this.getFormat()});
    }

    parseDate(dateString) {
        // Handle 'invalid date'  as null.
        const ret = moment(dateString, this.getFormat()).toDate();
        return isNaN(ret) ? null : ret;
    }
}
export const dateInput = elemFactory(DateInput);