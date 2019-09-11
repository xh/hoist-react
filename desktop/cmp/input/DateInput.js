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
import {createObservableRef} from '@xh/hoist/utils/react';
import {LocalDate, isLocalDate} from '@xh/hoist/utils/datetime';
import {warnIf, withDefault} from '@xh/hoist/utils/js';
import {bindable} from '@xh/hoist/mobx';
import {HoistInput} from '@xh/hoist/cmp/input';
import classNames from 'classnames';
import {wait} from '@xh/hoist/promise';

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
        value: PT.oneOfType([PT.instanceOf(Date), PT.instanceOf(LocalDate)]),

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
        maxDate: PT.oneOfType([PT.instanceOf(Date), PT.instanceOf(LocalDate)]),

        /** Minimum (inclusive) valid date. */
        minDate: PT.oneOfType([PT.instanceOf(Date), PT.instanceOf(LocalDate)]),

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
         * If undefined, control will not show time. Ignored when valueType is localDate.
         */
        timePrecision: PT.oneOf(['second', 'minute']),

        /** Type of value to publish. Defaults to 'date'. */
        valueType: PT.oneOf(['date', 'localDate'])
    };

    @bindable popoverOpen = false;

    inputRef = createObservableRef();
    buttonRef = createObservableRef();
    popoverRef = createObservableRef();
    baseClassName = 'xh-date-input';

    // Prop-backed convenience getters
    get maxDate() {
        const {maxDate} = this.props;
        if (!maxDate) return moment().add(100, 'years').toDate();
        return isLocalDate(maxDate) ? maxDate.date : maxDate;
    }

    get minDate() {
        const {minDate} = this.props;
        if (!minDate) return moment().subtract(100, 'years').toDate();
        return isLocalDate(minDate) ? minDate.date : minDate;
    }

    get valueType() {return withDefault(this.props.valueType, 'date')}
    get timePrecision() {return this.valueType === 'localDate' ? null : this.props.timePrecision}

    render() {
        const props = this.getNonLayoutProps();

        warnIf(
            (props.enableClear || props.enablePicker) && props.rightElement,
            'Cannot specify enableClear or enablePicker along with custom rightElement - built-in clear/picker button will not be shown.'
        );

        const layoutProps = this.getLayoutProps(),
            enablePicker = withDefault(props.enablePicker, true),
            enableTextInput = withDefault(props.enableTextInput, true),
            enableClear = withDefault(props.enableClear, false),
            rightElement = withDefault(props.rightElement, this.renderButtons(enablePicker, enableTextInput, enableClear)),
            isOpen = enablePicker && this.popoverOpen && !props.disabled;

        return div({
            item: popover({
                isOpen,
                minimal: true,
                usePortal: true,
                autoFocus: false,
                enforceFocus: false,
                position: withDefault(props.popoverPosition, 'auto'),
                popoverRef: this.popoverRef,
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
                    timePrecision: this.timePrecision,
                    timePickerProps: this.timePrecision ? assign({selectAllOnFocus: true}, props.timePickerProps) : undefined
                }),

                item: div({
                    item: textInput({
                        value: this.formatDate(this.renderValue),
                        className: this.getClassName(!enableTextInput && !props.disabled ? 'xh-date-input--picker-only' : null),
                        onCommit: this.onInputCommit,
                        rightElement,

                        disabled: props.disabled || !enableTextInput,
                        leftIcon: props.leftIcon,
                        tabIndex: props.tabIndex,
                        placeholder: props.placeholder,
                        textAlign: props.textAlign,
                        inputRef: this.inputRef,
                        ...layoutProps
                    }),
                    onClick: !enableTextInput && !props.disabled ? this.onOpenPopoverClick : null
                })
            }),
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            onKeyDown: this.onKeyDown
        });
    }

    renderButtons(enablePicker, enableTextInput, enableClear) {
        const {disabled} = this.getNonLayoutProps(),
            isClearable = this.internalValue !== null;

        return buttonGroup({
            padding: 0,
            items: [
                button({
                    className: 'xh-date-input__clear-icon',
                    omit: !enableClear || !isClearable || disabled,
                    icon: Icon.cross(),
                    tabIndex: -1,
                    onClick: this.onClearBtnClick
                }),
                button({
                    className: classNames('xh-date-input__picker-icon', enablePicker ? null : 'xh-date-input__picker-icon--disabled'),
                    icon: Icon.calendar(),
                    tabIndex: enableTextInput || disabled ? -1 : undefined,
                    elementRef: this.buttonRef,
                    onClick: enablePicker && !disabled ? this.onOpenPopoverClick : null
                })
            ]
        });
    }

    toExternal(internal) {
        if (this.valueType === 'localDate') return internal ? LocalDate.from(internal) : null;
        return internal;
    }

    toInternal(external) {
        if (this.valueType === 'localDate') return external ? external.date : null;
        return external;
    }

    /**
     * Custom blur handler to account for focus potentially living in either input or popover.
     * We want to call noteBlurred when focus has left both.
     */
    onBlur = () => {
        const activeEl = document.activeElement,
            popoverEl = this.popoverRef.current,
            popoverHasFocus = popoverEl && popoverEl.contains(activeEl),
            inputHasFocus = this.containsElement(activeEl);

        if (!popoverHasFocus && !inputHasFocus) {
            this.noteBlurred();
        }
    };

    noteBlurred() {
        super.noteBlurred();
        wait(1).then(() => {
            if (!this.hasFocus) {
                this.setPopoverOpen(false);
            }
        });
    }

    onClearBtnClick = (ev) => {
        this.noteValueChange(null);
        this.doCommit();
        this.consumeEvent(ev);
    };

    onOpenPopoverClick = (ev) => {
        this.setPopoverOpen(!this.popoverOpen);
        this.consumeEvent(ev);
    };

    onKeyDown = (ev) => {
        if (ev.key == 'Enter') {
            this.doCommit();
            this.consumeEvent(ev);
        } else if (this.popoverOpen && ev.key == 'Escape') {
            this.setPopoverOpen(false);
            this.consumeEvent(ev);
        } else if (!this.popoverOpen && ['ArrowUp', 'ArrowDown'].includes(ev.key)) {
            this.setPopoverOpen(true);
            this.consumeEvent(ev);
        }
    };

    onPopoverClose = () => {
        this.doCommit();
        if (this.hasFocus) {
            const {inputRef, buttonRef} = this;
            if (inputRef.current) {
                inputRef.current.focus();
            } else if (buttonRef.current) {
                buttonRef.current.focus();
            }
        }
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
        if (!this.timePrecision) {
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
        let {timePrecision} = this;
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
        const {timePrecision} = this,
            {formatString} = this.props;

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

    consumeEvent(e) {
        e.preventDefault();
        e.stopPropagation();
    }
}

export const dateInput = elemFactory(DateInput);