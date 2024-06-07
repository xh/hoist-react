/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, StyleProps, LayoutProps, HSide, PlainObject} from '@xh/hoist/core';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {singleDatePicker} from '@xh/hoist/kit/react-dates';
import '@xh/hoist/mobile/register';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {isLocalDate, LocalDate} from '@xh/hoist/utils/datetime';
import {withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import moment from 'moment';
import './DateInput.scss';
import {ForwardedRef, ReactElement} from 'react';

export interface DateInputProps extends HoistInputProps, StyleProps, LayoutProps {
    value?: Date | LocalDate;

    /** True to show a "clear" button aligned to the right of the control. Default false. */
    enableClear?: boolean;

    /**
     * MomentJS format string for date display and parsing. Defaults to `YYYY-MM-DD`.
     */
    formatString?: string;

    /**
     * Month to display in calendar popover on first render.
     *
     * If unspecified, will default to the month of the current value (if present), or today.
     */
    initialMonth?: Date | LocalDate;

    /** Icon to display inline on the left side of the input. */
    leftIcon?: ReactElement;

    /** Icon to display inline on the right side of the input. Defaults to a calendar icon */
    rightIcon?: ReactElement;

    /**
     * Maximum (inclusive) valid date. Controls which dates can be selected via the calendar
     * picker. Will reset any out-of-bounds manually entered input to `null`.
     *
     * Note this is distinct in these ways from FormModel based validation, which will leave an
     * invalid date entry in place but flag as invalid via FormField. For cases where it is
     * possible to use FormField, that is often a better choice.
     */
    maxDate?: Date | LocalDate;

    /**
     * Minimum (inclusive) valid date. Controls which dates can be selected via the calendar
     * picker. Will reset any out-of-bounds manually entered input to `null`.
     *
     * See note re. validation on maxDate, above.
     */
    minDate?: Date | LocalDate;

    /** Text to display when control is empty. */
    placeholder?: string;

    /** Props passed to SingleDatePicker component, as per SingleDatePicker docs. */
    singleDatePickerProps?: PlainObject;

    /** Alignment of entry text within control, default 'left'. */
    textAlign?: HSide;

    /** Type of value to publish. Defaults to 'date'. */
    valueType?: 'date' | 'localDate';
}

/**
 * A Calendar Control for choosing a Date.
 */
export const [DateInput, dateInput] = hoistCmp.withFactory<DateInputProps>({
    displayName: 'DateInput',
    className: 'xh-date-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, DateInputModel);
    }
});

(DateInput as any).hasLayoutSupport = true;

//---------------------------------
// Implementation
//---------------------------------
class DateInputModel extends HoistInputModel {
    override xhImpl = true;

    @observable popoverOpen = false;

    @action setPopoverOpen(bool) {
        this.popoverOpen = bool;
        if (this.popoverOpen) {
            this.noteFocused();
        } else {
            this.noteBlurred();
        }

        // Blur internal input to prevent keyboard showing, but maintain
        // HoistInputModel's hasFocus using the methods above.
        // See https://github.com/airbnb/react-dates/issues/1476
        const inputEl = this.domEl.querySelector('input');
        if (inputEl === document.activeElement) {
            inputEl.blur();
        }
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override blur() {
        this.setPopoverOpen(false);
    }

    override focus() {
        this.setPopoverOpen(true);
    }

    // Prop-backed convenience getters
    get maxDate() {
        const {maxDate} = this.componentProps;
        if (!maxDate) return moment().add(100, 'years');
        return isLocalDate(maxDate) ? maxDate.moment : moment(maxDate);
    }

    get minDate() {
        const {minDate} = this.componentProps;
        if (!minDate) return moment().subtract(100, 'years');
        return isLocalDate(minDate) ? minDate.moment : moment(minDate);
    }

    get initialMonth() {
        const {initialMonth} = this.componentProps;
        return isLocalDate(initialMonth) ? initialMonth.moment : moment(initialMonth);
    }

    get valueType() {
        return withDefault(this.componentProps.valueType, 'date');
    }

    override toExternal(internal) {
        if (this.valueType === 'localDate') return internal ? LocalDate.from(internal) : null;
        return internal;
    }

    override toInternal(external) {
        if (this.valueType === 'localDate') return external ? external.date : null;
        return external;
    }

    onDateChange = date => {
        if (date && this.isOutsideRange(date)) {
            // Dates outside of min/max constraints are reset to null.
            date = null;
            this.logDebug('Value exceeded max/minDate bounds on change - reset to null.');
        }
        this.noteValueChange(date ? date.toDate() : null);
    };

    isOutsideRange(date) {
        return date.isBefore(this.minDate, 'day') || date.isAfter(this.maxDate, 'day');
    }

    getFormat() {
        const {formatString} = this.componentProps;
        return formatString || 'YYYY-MM-DD';
    }

    formatDate(date) {
        return fmtDate(date, {fmt: this.getFormat(), asHtml: true});
    }
}

const cmp = hoistCmp.factory<DateInputModel>(({model, className, ...props}, ref) => {
    const layoutProps = getLayoutProps(props),
        {renderValue} = model,
        value = renderValue ? moment(renderValue) : null,
        enableClear = withDefault(props.enableClear, false),
        textAlign = withDefault(props.textAlign, 'left'),
        leftIcon = withDefault(props.leftIcon, null),
        rightIcon = withDefault(props.rightIcon, Icon.calendar()),
        isOpen = model.popoverOpen && !props.disabled;

    return div({
        className,
        items: [
            leftIcon,
            singleDatePicker({
                date: value,
                focused: isOpen,
                onFocusChange: ({focused}) => model.setPopoverOpen(focused),
                onDateChange: date => model.onDateChange(date),
                initialVisibleMonth: () => model.initialMonth,
                isOutsideRange: date => model.isOutsideRange(date),
                withPortal: true,
                noBorder: true,
                numberOfMonths: 1,
                displayFormat: model.getFormat(),
                showClearDate: enableClear,
                placeholder: props.placeholder,

                ...props.singleDatePickerProps
            }),
            rightIcon
        ],
        style: {
            ...props.style,
            ...layoutProps,
            textAlign
        },
        ref: ref as ForwardedRef<any>
    });
});
