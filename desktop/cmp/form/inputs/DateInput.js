/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import moment from 'moment';
import {assign, clone} from 'lodash';

import {fmtDate} from '@xh/hoist/format/index';
import {elemFactory, HoistComponent} from '@xh/hoist/core/index';
import {dateInput as bpDateInput} from '@xh/hoist/kit/blueprint/index';
import {Ref} from '@xh/hoist/utils/react/index';
import {withDefault} from '@xh/hoist/utils/js/index';
import {HoistInput} from '@xh/hoist/cmp/form/index';

/**
 * A Calendar Control for choosing a Date.
 *
 *
 * TODO - fix popover closing when you attempt to interact with it over multiple clicks
 *
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

        /** Icon to display on the left side of the control. */
        leftIcon: PT.element,

        /** Maximum (inclusive) valid date. */
        maxDate: PT.instanceOf(Date),

        /** Minimum (inclusive) valid date. */
        minDate: PT.instanceOf(Date),

        /** Position for calendar popover, as per Blueprint docs. */
        popoverPosition: PT.oneOf([
            'top-left', 'top', 'top-right',
            'right-top', 'right', 'right-bottom',
            'bottom-right', 'bottom', 'bottom-left',
            'left-bottom', 'left', 'left-top',
            'auto'
        ]),

        /** Element to display on the right side of the field */
        rightElement: PT.element,

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

    child = new Ref();

    baseClassName = 'xh-date-input';

    get commitOnChange() {
        withDefault(this.props.commitOnChange, false);
    }

    render() {
        const {props} = this;

        return bpDateInput({
            value: this.renderValue,
            ref: this.child.ref,

            formatDate: this.formatDate,
            parseDate: this.parseDate,

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
                onKeyPress: this.onKeyPress,
            },
            maxDate: props.maxDate,
            minDate: props.minDate,
            popoverProps: {
                minimal: true,
                usePortal: true,
                position: withDefault(props.popoverPosition, 'auto'),
                onClose: this.onPopoverWillClose
            },
            rightElement: props.rightElement,
            tabIndex: props.tabIndex,
            timePickerProps: props.timePrecision ? props.timePickerProps : undefined,
            timePrecision: props.timePrecision,

            className: this.getClassName(),

            onChange: this.onChange
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

        if (date) {
            const {minDate, maxDate} = this.props;
            if (date < minDate) date = minDate;
            if (date > maxDate) date = maxDate;
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
        this.child.value.setState({isOpen: false});
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
