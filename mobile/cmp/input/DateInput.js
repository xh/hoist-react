/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInput} from '@xh/hoist/cmp/input';
import {div} from '@xh/hoist/cmp/layout';
import {elemFactory, LayoutSupport} from '@xh/hoist/core';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {singleDatePicker} from '@xh/hoist/kit/react-dates';
import {bindable} from '@xh/hoist/mobx';
import {isLocalDate, LocalDate} from '@xh/hoist/utils/datetime';
import {withDefault} from '@xh/hoist/utils/js';
import moment from 'moment';
import PT from 'prop-types';
import './DateInput.scss';

/**
 * A Calendar Control for choosing a Date.
 */
@LayoutSupport
export class DateInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.oneOfType([PT.instanceOf(Date), PT.instanceOf(LocalDate)]),

        /** True to show a "clear" button aligned to the right of the control. Default false. */
        enableClear: PT.bool,

        /**
         * MomentJS format string for date display and parsing. Defaults to `YYYY-MM-DD`.
         */
        formatString: PT.string,

        /**
         * Month to display in calendar popover on first render.
         *
         * If unspecified, will default to the month of the current value (if present), or today.
         */
        initialMonth: PT.oneOfType([PT.instanceOf(Date), PT.instanceOf(LocalDate)]),

        /** Icon to display inline on the left side of the input. */
        leftIcon: PT.element,

        /** Icon to display inline on the right side of the input. Defaults to a calendar icon */
        rightIcon: PT.element,

        /**
         * Maximum (inclusive) valid date. Controls which dates can be selected via the calendar
         * picker. Will reset any out-of-bounds manually entered input to `null`.
         *
         * Note this is distinct in these ways from FormModel based validation, which will leave an
         * invalid date entry in place but flag as invalid via FormField. For cases where it is
         * possible to use FormField, that is often a better choice.
         */
        maxDate: PT.oneOfType([PT.instanceOf(Date), PT.instanceOf(LocalDate)]),

        /**
         * Minimum (inclusive) valid date. Controls which dates can be selected via the calendar
         * picker. Will reset any out-of-bounds manually entered input to `null`.
         *
         * See note re. validation on maxDate, above.
         */
        minDate: PT.oneOfType([PT.instanceOf(Date), PT.instanceOf(LocalDate)]),

        /** Text to display when control is empty. */
        placeholder: PT.string,

        /** Props passed to SingleDatePicker component, as per SingleDatePicker docs. */
        singleDatePickerProps: PT.object,

        /** Alignment of entry text within control, default 'left'. */
        textAlign: PT.oneOf(['left', 'right']),

        /** Type of value to publish. Defaults to 'date'. */
        valueType: PT.oneOf(['date', 'localDate'])
    };

    @bindable popoverOpen = false;

    baseClassName = 'xh-date-input';

    // Prop-backed convenience getters
    get maxDate() {
        const {maxDate} = this.props;
        if (!maxDate) return moment().add(100, 'years');
        return isLocalDate(maxDate) ? maxDate.moment : moment(maxDate);
    }

    get minDate() {
        const {minDate} = this.props;
        if (!minDate) return moment().subtract(100, 'years');
        return isLocalDate(minDate) ? minDate.moment : moment(minDate);
    }

    get initialMonth() {
        const {initialMonth} = this.props;
        return isLocalDate(initialMonth) ? initialMonth.moment : moment(initialMonth);
    }

    get valueType() {
        return withDefault(this.props.valueType, 'date');
    }

    render() {
        const props = this.getNonLayoutProps(),
            layoutProps = this.getLayoutProps(),
            value = this.renderValue ? moment(this.renderValue) : null,
            enableClear = withDefault(props.enableClear, false),
            textAlign = withDefault(props.textAlign, 'left'),
            leftIcon = withDefault(props.leftIcon, null),
            rightIcon = withDefault(props.rightIcon, Icon.calendar()),
            isOpen = this.popoverOpen && !props.disabled;

        return div({
            className: this.getClassName(),
            items: [
                leftIcon,
                singleDatePicker({
                    date: value,
                    focused: isOpen,
                    onFocusChange: ({focused}) => this.setPopoverOpen(focused),
                    onDateChange: (date) => this.onDateChange(date),
                    initialVisibleMonth: () => this.initialMonth,
                    isOutsideRange: (date) => this.isOutsideRange(date),
                    withPortal: true,
                    noBorder: true,
                    numberOfMonths: 1,
                    displayFormat: this.getFormat(),
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
            }
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

    onDateChange = (date) => {
        if (date && this.isOutsideRange(date)) {
            // Dates outside of min/max constraints are reset to null.
            date = null;
            console.debug('DateInput value exceeded max/minDate bounds on change - reset to null.');
        }
        this.noteValueChange(date ? date.toDate() : null);
    };

    isOutsideRange(date) {
        return date.isBefore(this.minDate, 'day') || date.isAfter(this.maxDate, 'day');
    }

    getFormat() {
        const {formatString} = this.props;
        return formatString || 'YYYY-MM-DD';
    }

    formatDate(date) {
        return fmtDate(date, {fmt: this.getFormat()});
    }
}

export const dateInput = elemFactory(DateInput);