/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import moment from 'moment';
import {assign, clone} from 'lodash';

import {fmtDate} from '@xh/hoist/format';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {datePicker as bpDatePicker, popover} from '@xh/hoist/kit/blueprint';
import {div} from '@xh/hoist/cmp/layout';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {button, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {Ref} from '@xh/hoist/utils/react';
import {warnIf, withDefault} from '@xh/hoist/utils/js';
import {bindable} from '@xh/hoist/mobx';
import {HoistInput} from '@xh/hoist/cmp/input';

import './DateInput.scss';

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

        /** Enable using the DatePicker popover. Default true. */
        enablePicker: PT.bool,

        /** Enable using the text control to enter date as text. Default true. */
        enableTextInput: PT.bool,

        /** True to show a "clear" button aligned to the right of the control. Default false. */
        enableClear: PT.bool,

        /**
         * MomentJS format string for date display and parsing. Defaults to `YYYY-MM-DD HH:mm:ss`,
         * with default presence of time components determined by the timePrecision prop.
         */
        formatString: PT.string,

        /** Icon to display inline on the left side of the input. */
        leftIcon: PT.element,

        /**
         * Element to display inline on the right side of the input. Note if provided, this will
         * take the place of the (default) calendar-picker button and (optional) clear button.
         */
        rightElement: PT.element,

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

        /** True to show the picker upon focusing the input. */
        showPickerOnFocus: PT.bool,

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
            layoutProps = this.getLayoutProps(),
            enablePicker = withDefault(props.enablePicker, true),
            enableTextInput = withDefault(props.enableTextInput, true),
            enableClear = withDefault(props.enableClear, false),
            isPickerOnlyMode = !enableTextInput && !props.disabled,
            rightElement = withDefault(props.rightElement, this.renderButtons(enableClear, enablePicker)),
            isOpen = enablePicker && this.popoverOpen && !props.disabled;

        warnIf(
            (props.enableClear || props.enablePicker) && props.rightElement,
            'Cannot specify enableClear or enablePicker along with custom rightElement - built-in clear/picker button will not be shown.'
        );

        return div({
            item: popover({
                isOpen,
                minimal: true,
                usePortal: true,
                autoFocus: false,
                enforceFocus: false,
                position: withDefault(props.popoverPosition, 'auto'),
                popoverRef: this.popoverRef.ref,
                onClose: this.onPopoverClose,
                onInteraction: (nextOpenState) => {
                    if (this.props.showPickerOnFocus) {
                        this.setPopoverOpen(nextOpenState);
                    } else if (!nextOpenState) {
                        this.setPopoverOpen(false);
                    }
                },

                content: bpDatePicker({
                    value: this.renderValue,
                    onChange: this.onDatePickerChange,
                    maxDate: this.maxDate,
                    minDate: this.minDate,
                    showActionsBar: props.showActionsBar,
                    dayPickerProps: assign({fixedWeeks: true}, props.dayPickerProps),
                    timePickerProps: props.timePrecision ? assign({selectAllOnFocus: true}, props.timePickerProps) : undefined,
                    timePrecision: props.timePrecision
                }),

                item: textInput({
                    value: this.formatDate(this.renderValue),
                    className: this.getClassName(isPickerOnlyMode ? 'picker-only-input' : null),
                    onCommit: this.onInputCommit,
                    rightElement,

                    disabled: props.disabled || !enableTextInput,
                    leftIcon: props.leftIcon,
                    tabIndex: props.tabIndex,
                    placeholder: props.placeholder,
                    textAlign: props.textAlign,

                    ...layoutProps
                })
            }),

            onClick: !enableTextInput ? this.onOpenPopoverClick : null,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            onKeyDown: this.onKeyDown
        });
    }

    renderButtons(enableClear, enablePicker) {
        const props = this.getNonLayoutProps(),
            enableTextInput = withDefault(props.enableTextInput, true),
            isClearable = (this.internalValue !== null),
            isPickerOnlyMode = !enableTextInput && !props.disabled;

        return buttonGroup({
            padding: 0,
            items: [
                button({
                    omit: !enableClear || !isClearable,
                    icon: Icon.cross(),
                    tabIndex: isPickerOnlyMode ? undefined : -1, // Prevent focus on tab, unless in pickerOnly mode
                    onClick: this.onClearBtnClick
                }),
                button({
                    className: enablePicker ? '' : 'disabled-picker-icon',
                    icon: Icon.calendar(),
                    tabIndex: isPickerOnlyMode ? undefined : -1, // Prevent focus on tab, unless in pickerOnly mode
                    onClick: enablePicker ? this.onOpenPopoverClick : null
                })
            ]
        });
    }

    /**
     * Custom blur handler to account for focus potentially living in either input or popover.
     * We want to call noteBlurred when focus has left both.
     */
    onBlur = () => {
        const activeEl = document.activeElement,
            popoverEl = this.popoverRef.value,
            popoverHasFocus = popoverEl && popoverEl.contains(activeEl),
            inputHasFocus = this.containsElement(activeEl);

        if (!popoverHasFocus && !inputHasFocus) {
            this.noteBlurred();
        }
    };

    onClearBtnClick = (ev) => {
        this.noteValueChange(null);
        this.doCommit();
        ev.stopPropagation();
    };

    onOpenPopoverClick = (ev) => {
        this.setPopoverOpen(!this.popoverOpen);
        ev.stopPropagation();
    };

    onKeyDown = (ev) => {
        if (ev.key == 'Enter') {
            this.doCommit();
        }
        if (this.popoverOpen && ev.key == 'Escape') {
            this.setPopoverOpen(false);
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

        // If no time component, selecting a date in the picker is most likely a "click and done"
        // operation for the user, so we dismiss the picker for them. When there *is* a time to set,
        // however, the picker is used to adjust multiple fields and should stay visible.
        if (!this.props.timePrecision) {
            this.setPopoverOpen(false);
        }
    };

    onDateChange = (date) => {
        if (date) {
            const {minDate, maxDate} = this;
            if (minDate && date < minDate) date = minDate;
            if (maxDate && date > maxDate) date = maxDate;
            date = this.applyPrecision(date);
        }
        this.noteValueChange(date);
    };

    applyPrecision(date) {
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