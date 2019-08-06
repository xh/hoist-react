/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {HoistInput} from '@xh/hoist/cmp/input';
import {CalendarDate} from '@xh/hoist/utils/datetime';
import {warnIf} from '@xh/hoist/utils/js';
import {omit} from 'lodash';
import moment from 'moment';

import {DateInput, dateInput} from './DateInput';

/**
 * A DateInput that publishes a CalendarDate string as its value.
 */
@HoistComponent
@LayoutSupport
export class CalendarDateInput extends HoistInput {

    static propTypes = {
        ...DateInput.propTypes
    };

    get maxDate() {return this.props.maxDate || moment().add(100, 'years').toDate()}
    get minDate() {return this.props.minDate || moment().subtract(100, 'years').toDate()}

    render() {
        // Warn if attempting to pass unsupported DateInput props
        const {timePrecision, ...props} = this.props;
        warnIf(timePrecision, 'timePrecision is not supported');

        return dateInput({
            value: this.internalValue,
            onChange: this.onChange,
            ...omit(props, ['value', 'model', 'bind'])
        });
    }

    toExternal(internal) {
        return new CalendarDate(internal);
    }

    toInternal(external) {
        return external && external.isCalendarDate ? external.date : null;
    }

    onChange = (date) => {
        if (date) {
            const {minDate, maxDate} = this;
            if (minDate && date < minDate) date = minDate;
            if (maxDate && date > maxDate) date = maxDate;
            date.setHours(0, 0, 0, 0);
        }
        this.noteValueChange(date);
    };
}
export const calendarDateInput = elemFactory(CalendarDateInput);