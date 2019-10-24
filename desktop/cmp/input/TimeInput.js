import moment from 'moment';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {HoistInput} from '@xh/hoist/cmp/input';
import {withDefault} from '@xh/hoist/utils/js';
import {timePicker} from '@xh/hoist/kit/blueprint';

import './TimeInput.scss';

// TODO: Docs here
@HoistComponent
@LayoutSupport
export class TimeInput extends HoistInput {

    // TODO: Proptypes here

    baseClassName = 'xh-time-input';

    // Prop-backed convenience getters
    get maxTime() {
        const {maxTime} = this.props;
        if (!maxTime) return moment().set({'hour': 23, 'minute': 59, 'second': 59, 'millisecond': 999}).toDate();
        return maxTime;
    }
    get minTime() {
        const {minTime} = this.props;
        if (!minTime) return moment().set({'hour': 0, 'minute': 0, 'second': 0, 'millisecond': 1}).toDate();
        return minTime;
    }

    render() {
        const props = this.getNonLayoutProps(),
            {width, ...layoutProps} = this.getLayoutProps(),
            {renderValue} = this;

        return timePicker({
            value: renderValue,
            disabled: props.disabled,
            maxTime: this.maxTime,
            minTime: this.minTime,
            onChange: this.onChange,
            precision: props.precision,
            selectAllOnFocus: props.selectOnFocus,
            showArrowButtons: props.showArrowButtons,
            useAmPm: props.useAmPm,
            className: this.getClassName(renderValue == null ? ['null-time'] : null),
            style: {
                ...props.style,
                ...layoutProps,
                width: withDefault(width, 200) // Not sure about this
            }
        });
    }

    onChange = (newTime) => {
        const {minTime, maxTime} = this;
        if (newTime < minTime) newTime = null;
        if (newTime > maxTime) newTime = null;

        this.noteValueChange(newTime);
    }

}

export const timeInput = elemFactory(TimeInput);