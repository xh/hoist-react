/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, useHoistInputModel, HoistInputPropTypes} from '@xh/hoist/cmp/input';
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {button, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {datePicker as bpDatePicker, popover} from '@xh/hoist/kit/blueprint';
import {bindable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {isLocalDate, LocalDate} from '@xh/hoist/utils/datetime';
import {warnIf, withDefault} from '@xh/hoist/utils/js';
import {createObservableRef, getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {assign, clone} from 'lodash';
import moment from 'moment';
import PT from 'prop-types';
import './DateInput.scss';

/**
 * A Calendar Control for choosing a Date.
 *
 * By default this control emits dates with the time component cleared (set to midnight), but this
 * can be customized via the timePrecision prop to support editing of a date and time together.
 *
 * The calendar popover can be opened via the built-in button or up/down arrow keyboard shortcuts.
 */
export const [DateInput, dateInput] = hoistCmp.withFactory({
    displayName: 'DateInput',
    className: 'xh-date-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, Model);
    }
});
DateInput.propTypes = {
    ...HoistInputPropTypes,
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

    /**
     * Month to display in calendar popover on first render.
     *
     * If unspecified will default to the month of the current value (if present) or closest
     * valid value.
     */
    initialMonth: PT.oneOfType([PT.instanceOf(Date), PT.instanceOf(LocalDate)]),

    /** Icon to display inline on the left side of the input. */
    leftIcon: PT.element,

    /**
     * Element to display inline on the right side of the input. Note if provided, this will
     * take the place of the (default) calendar-picker button and (optional) clear button.
     */
    rightElement: PT.element,

    /**
     * Maximum (inclusive) valid date that can be entered by the user via the calendar picker or
     * keyboard.  Will reset any out-of-bounds manually entered input to `null`.
     *
     * Note that this does not prevent the application from setting a value for this control
     * programmatically out of this range.  It is also distinct from FormModel based validation,
     * which will flag an invalid date in a Form. For Form usages, it may be advisable to set
     * validation constraints in addition to this property.
     */
    maxDate: PT.oneOfType([PT.instanceOf(Date), PT.instanceOf(LocalDate)]),

    /**
     * Maximum (inclusive) valid date that can be entered by the user via the calendar picker or
     * keyboard.  Will reset any out-of-bounds manually entered input to `null`.
     *
     * See note re. validation on maxDate, above.
     */
    minDate: PT.oneOfType([PT.instanceOf(Date), PT.instanceOf(LocalDate)]),

    /** Text to display when control is empty. */
    placeholder: PT.string,

    /**
     * Position for calendar popover, as per Blueprint docs.
     * @see https://blueprintjs.com/docs/#datetime/dateinput
     */
    popoverPosition: PT.oneOf([
        'top-left', 'top', 'top-right',
        'right-top', 'right', 'right-bottom',
        'bottom-right', 'bottom', 'bottom-left',
        'left-bottom', 'left', 'left-top',
        'auto'
    ]),

    /** True to select contents when control receives focus. */
    selectOnFocus: PT.bool,

    /** True to show a bar with Today + Clear buttons at bottom of date picker popover. */
    showActionsBar: PT.bool,

    /** True to show the picker upon focusing the input. */
    showPickerOnFocus: PT.bool,

    /**
     * True to parse any dates entered via the text input with moment's "strict" mode enabled.
     * This ensures that the input entry matches the format specified by `formatString` exactly.
     * If it does not, the input will be considered invalid and the value set to `null`.
     * @see https://momentjs.com/guides/#/parsing/strict-mode/
     */
    strictInputParsing: PT.bool,

    /** Alignment of entry text within control, default 'left'. */
    textAlign: PT.oneOf(['left', 'right']),

    /**
     * Props passed to the TimePicker, as per Blueprint docs.
     * @see https://blueprintjs.com/docs/#datetime/dateinput
     */
    timePickerProps: PT.object,

    /**
     * The precision of time selection that accompanies the calendar.
     * If undefined, control will not show time. Ignored when valueType is localDate.
     */
    timePrecision: PT.oneOf(['second', 'minute']),

    /**
     * Type of value to publish. Defaults to 'date'. The use of 'localDate' is often a good
     * choice for use cases where there is no time component.
     * @see LocalDate - the class that will be published when localDate mode.
     */
    valueType: PT.oneOf(['date', 'localDate'])
};
DateInput.hasLayoutSupport = true;

//---------------------------------
// Implementation
//---------------------------------
class Model extends HoistInputModel {

    @bindable popoverOpen = false;

    inputRef = createObservableRef();
    buttonRef = createObservableRef();
    popoverRef = createObservableRef();

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

    get initialMonth() {
        const {initialMonth} = this.props;
        return isLocalDate(initialMonth) ? initialMonth.date : initialMonth;
    }

    get valueType()             {return withDefault(this.props.valueType, 'date')}
    get strictInputParsing()    {return withDefault(this.props.strictInputParsing, false)}
    get timePrecision()         {return this.valueType === 'localDate' ? null : this.props.timePrecision}

    constructor(props) {
        super(props);
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
        if (ev.key === 'Enter') {
            this.doCommit();
            this.consumeEvent(ev);
        } else if (this.popoverOpen && ev.key === 'Escape') {
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
            // Dates outside of min/max constraints are reset to null.
            const {minDate, maxDate} = this;
            if (minDate && date < minDate) date = null;
            if (maxDate && date > maxDate) date = null;
            if (date) {
                date = this.applyPrecision(date);
            } else {
                console.debug('DateInput value exceeded max/minDate bounds on change - reset to null.');
            }
        }
        this.noteValueChange(date);
    };

    applyPrecision(date) {
        let {timePrecision} = this;
        date = clone(date);
        if (timePrecision === 'second') {
            date.setMilliseconds(0);
        } else if (timePrecision === 'minute') {
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
        if (timePrecision === 'minute') {
            ret += ' HH:mm';
        } else if (timePrecision === 'second') {
            ret += ' HH:mm:ss';
        }
        return ret;
    }

    formatDate(date) {
        return fmtDate(date, {fmt: this.getFormat()});
    }

    parseDate(dateString) {
        const parsedMoment = moment(dateString, this.getFormat(), this.strictInputParsing);
        return parsedMoment.isValid() ? parsedMoment.toDate() : null;
    }

    consumeEvent(e) {
        e.preventDefault();
        e.stopPropagation();
    }
}

const cmp = hoistCmp.factory(
    ({model, className, ...props}, ref) => {
        warnIf(
            (props.enableClear || props.enablePicker) && props.rightElement,
            'Cannot specify enableClear or enablePicker along with custom rightElement - built-in clear/picker button will not be shown.'
        );

        const enablePicker = props.enablePicker ?? true,
            enableTextInput = props.enableTextInput ?? true,
            enableClear = props.enableClear ?? false,
            disabled = props.disabled ?? false,
            isClearable = model.internalValue !== null,
            isOpen = enablePicker && model.popoverOpen && !disabled;

        const buttons = buttonGroup({
            padding: 0,
            items: [
                button({
                    className: 'xh-date-input__clear-icon',
                    omit: !enableClear || !isClearable || disabled,
                    icon: Icon.cross(),
                    tabIndex: -1,
                    onClick: model.onClearBtnClick
                }),
                button({
                    className: classNames('xh-date-input__picker-icon', enablePicker ? null : 'xh-date-input__picker-icon--disabled'),
                    icon: Icon.calendar(),
                    tabIndex: enableTextInput || disabled ? -1 : undefined,
                    elementRef: model.buttonRef,
                    onClick: enablePicker && !disabled ? model.onOpenPopoverClick : null
                })
            ]
        });
        const rightElement = withDefault(props.rightElement, buttons);

        let {minDate, maxDate, initialMonth, renderValue} = model;

        // If app has set an out-of-range date, we render it -- these bounds govern *manual* entry
        // But need to relax constraints on the picker, to prevent BP from breaking badly
        if (renderValue) {
            if (minDate && renderValue < minDate) minDate = renderValue;
            if (maxDate && renderValue > maxDate) maxDate = renderValue;
        }

        // BP chooses annoying mid-point if forced to guess initial month. Use closest bound instead
        if (!initialMonth && !renderValue) {
            const today = new Date();
            if (minDate && today < minDate) initialMonth = minDate;
            if (maxDate && today > maxDate) initialMonth = maxDate;
        }

        return div({
            item: popover({
                isOpen,
                minimal: true,
                usePortal: true,
                autoFocus: false,
                enforceFocus: false,
                position: props.popoverPosition ?? 'auto',
                popoverRef: model.popoverRef,
                onClose: model.onPopoverClose,
                onInteraction: (nextOpenState) => {
                    if (props.showPickerOnFocus) {
                        model.setPopoverOpen(nextOpenState);
                    } else if (!nextOpenState) {
                        model.setPopoverOpen(false);
                    }
                },

                content: bpDatePicker({
                    value: renderValue,
                    onChange: model.onDatePickerChange,
                    maxDate,
                    minDate,
                    initialMonth,
                    showActionsBar: props.showActionsBar,
                    dayPickerProps: assign({fixedWeeks: true}, props.dayPickerProps),
                    timePrecision: model.timePrecision,
                    timePickerProps: model.timePrecision ? assign({selectAllOnFocus: true}, props.timePickerProps) : undefined
                }),

                item: div({
                    item: textInput({
                        value: model.formatDate(renderValue),
                        className: classNames(className, !enableTextInput && !disabled ? 'xh-date-input--picker-only' : null),
                        onCommit: model.onInputCommit,
                        rightElement,

                        disabled: disabled || !enableTextInput,
                        leftIcon: props.leftIcon,
                        tabIndex: props.tabIndex,
                        placeholder: props.placeholder,
                        textAlign: props.textAlign,
                        selectOnFocus: props.selectOnFocus,
                        inputRef: model.inputRef,
                        ...getLayoutProps(props)
                    }),
                    onClick: !enableTextInput && !disabled ? model.onOpenPopoverClick : null
                })
            }),
            onBlur: model.onBlur,
            onFocus: model.onFocus,
            onKeyDown: model.onKeyDown,
            ref
        });
    }
);