import PT from 'prop-types';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {endOfToday, startOfToday} from '@xh/hoist/utils/datetime';
import {div} from '@xh/hoist/cmp/layout';
import {HoistInput} from '@xh/hoist/cmp/input';
import {timePicker} from '@xh/hoist/kit/blueprint';

import './TimeInput.scss';

// TODO: Docs here
@HoistComponent
@LayoutSupport
export class TimeInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.oneOfType([PT.instanceOf(Date)]), // TODO: Add LocalTime once api is ready

        /** True to show a "clear" button aligned to the right of the control. Default false. */
        enableClear: PT.bool, // TODO: Implement

        /**
         * Maximum (inclusive) valid time. Controls which times can be inputted.
         * Will reset any out-of-bounds input to `null`.
         *
         * Note this is distinct in these ways from FormModel based validation, which will leave an
         * invalid entry in place but flag as invalid via FormField. For cases where it is
         * possible to use FormField, that is often a better choice.
         */
        maxDate: PT.oneOfType([PT.instanceOf(Date)]), // TODO: Add LocalTime once api is ready

        /**
         * Minimum (inclusive) valid time. Controls which times can be inputted
         * picker. Will reset any out-of-bounds manually entered input to `null`.
         *
         * See note re. validation on maxTime, above.
         */
        minDate: PT.oneOfType([PT.instanceOf(Date)]), // TODO: Add LocalTime once api is ready


        /**
         * The precision of time selection. Default to 'second'
         */
        precision: PT.oneOf(['millisecond', 'second', 'minute']),

        /** True to select contents when control receives focus. */
        selectOnFocus: PT.bool

        // TODO: this
        // /** Type of value to publish. Defaults to 'date'. */
        // valueType: PT.oneOf(['date', 'localDate'])
    };


    baseClassName = 'xh-time-input';

    // Prop-backed convenience getters
    get maxTime() {
        const {maxTime} = this.props;
        if (!maxTime) return startOfToday();
        return maxTime;
    }
    get minTime() {
        const {minTime} = this.props;
        if (!minTime) return endOfToday();
        return minTime;
    }

    render() {
        const {disabled, precision, selectOnFocus, showArrowButtons, style, useAmPm} = this.getNonLayoutProps(),
            layoutProps = this.getLayoutProps(),
            {renderValue, maxTime, minTime, onChange} = this;

        return div({
            style: {
                ...style,
                ...layoutProps
            },
            item: timePicker({
                value: renderValue,
                disabled: disabled,
                maxTime: maxTime,
                minTime: minTime,
                onChange: onChange,
                precision: precision,
                selectAllOnFocus: selectOnFocus,
                showArrowButtons: showArrowButtons,
                useAmPm: useAmPm,
                className: this.getClassName(renderValue == null ? ['null-time'] : null)
            })
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