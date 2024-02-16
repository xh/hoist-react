/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, useHoistInputModel} from '@xh/hoist/cmp/input';
import {MobileDateInputProps as DateInputProps} from '@xh/hoist/cmp/input';
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
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
export {DateInputProps};

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
        ref
    });
});
