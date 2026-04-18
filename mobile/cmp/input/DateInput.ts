/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, LayoutProps, StyleProps} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {input} from '@xh/hoist/kit/onsen';
import {button} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';
import {isLocalDate, LocalDate} from '@xh/hoist/utils/datetime';
import {getTestId, TEST_ID, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import type {Property} from 'csstype';
import {ChangeEvent, ReactElement} from 'react';
import './DateInput.scss';

export interface DateInputProps extends HoistProps, HoistInputProps, StyleProps, LayoutProps {
    value?: Date | LocalDate;

    /** True to show a "clear" button aligned to the right of the control. Defaults to false. */
    enableClear?: boolean;

    /** Icon to display inline on the left side of the input. */
    leftIcon?: ReactElement;

    /** Icon to display inline on the right side of the input. Defaults to a calendar icon. */
    rightIcon?: ReactElement;

    /**
     * Maximum (inclusive) valid date. Applied to the native input's `max` attribute and also
     * enforced on commit, resetting any out-of-bounds value to `null`.
     *
     * Note this is distinct in these ways from FormModel based validation, which will leave an
     * invalid date entry in place but flag as invalid via FormField. For cases where it is
     * possible to use FormField, that is often a better choice.
     */
    maxDate?: Date | LocalDate;

    /**
     * Minimum (inclusive) valid date. Applied to the native input's `min` attribute and also
     * enforced on commit, resetting any out-of-bounds value to `null`.
     *
     * See note re. validation on maxDate, above.
     */
    minDate?: Date | LocalDate;

    /** Alignment of entry text within control, default 'left'. */
    textAlign?: Property.TextAlign;

    /** Type of value to publish. Defaults to 'date'. */
    valueType?: 'date' | 'localDate';
}

/**
 * A mobile-first calendar control for choosing a Date, backed by the browser's native
 * `<input type="date">` element. Tapping the input invokes the OS-provided date picker -
 * a drum/wheel on iOS, a Material date dialog on Android, and a popover calendar on desktop
 * browsers.
 *
 * The in-input display and picker UI follow the user's OS locale. Values are read from and
 * written to the underlying input as ISO-8601 (`YYYY-MM-DD`) strings.
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

    get valueType(): 'date' | 'localDate' {
        return withDefault(this.componentProps.valueType, 'date');
    }

    get minDate(): Date | null {
        return resolveBoundDate(this.componentProps.minDate);
    }

    get maxDate(): Date | null {
        return resolveBoundDate(this.componentProps.maxDate);
    }

    get showClearButton(): boolean {
        const {enableClear, disabled} = this.componentProps;
        return !!enableClear && !disabled && this.renderValue != null;
    }

    override toExternal(internal: Date | null): Date | LocalDate | null {
        if (this.valueType === 'localDate') return internal ? LocalDate.from(internal) : null;
        return internal;
    }

    override toInternal(external: Date | LocalDate | null): Date | null {
        if (external == null) return null;
        return isLocalDate(external) ? external.date : (external as Date);
    }

    onInputChange = (ev: ChangeEvent<HTMLInputElement>) => {
        const str = ev.target.value;
        if (!str) {
            this.noteValueChange(null);
            return;
        }

        let date = isoToDate(str);
        if (date && this.isOutsideRange(date)) {
            this.logDebug('Value exceeded max/minDate bounds on change - reset to null.');
            date = null;
        }
        this.noteValueChange(date);
    };

    isOutsideRange(date: Date): boolean {
        const {minDate, maxDate} = this,
            stamped = stripTime(date);
        if (minDate && stamped < minDate) return true;
        if (maxDate && stamped > maxDate) return true;
        return false;
    }
}

const cmp = hoistCmp.factory<DateInputModel>(({model, className, ...props}, ref) => {
    const {width, ...layoutProps} = getLayoutProps(props),
        {renderValue} = model,
        textAlign = withDefault(props.textAlign, 'left'),
        leftIcon = withDefault(props.leftIcon, null),
        rightIcon = withDefault(props.rightIcon, Icon.calendar());

    return hbox({
        ref,
        className,
        style: {
            ...props.style,
            ...layoutProps,
            width: withDefault(width, null)
        },
        items: [
            leftIcon,
            input({
                type: 'date',
                className: 'xh-date-input__input',
                value: dateToIso(renderValue as Date) ?? '',
                min: dateToIso(model.minDate),
                max: dateToIso(model.maxDate),
                disabled: props.disabled,
                tabIndex: props.tabIndex,
                style: {textAlign},
                [TEST_ID]: props.testId,

                onChange: model.onInputChange,
                onFocus: model.onFocus,
                onBlur: model.onBlur
            }),
            clearButton(),
            rightIcon
        ]
    });
});

const clearButton = hoistCmp.factory<DateInputModel>(({model}) =>
    button({
        className: 'xh-date-input__clear-button',
        icon: Icon.cross(),
        tabIndex: -1,
        minimal: true,
        omit: !model.showClearButton,
        testId: getTestId(model.componentProps, 'clear-btn'),
        onClick: () => {
            // Intentionally no refocus after clearing - on iOS/Android, focusing the native
            // date input reopens the OS picker, which is unwanted UX after an explicit clear.
            model.noteValueChange(null);
            model.doCommit();
        }
    })
);

//---------------------------------
// Local helpers - date <-> ISO
//---------------------------------
function resolveBoundDate(val: Date | LocalDate | undefined | null): Date | null {
    if (val == null) return null;
    return isLocalDate(val) ? val.date : stripTime(val);
}

function isoToDate(iso: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!match) return null;
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
}

function dateToIso(date: Date | null | undefined): string | undefined {
    if (date == null) return undefined;
    const y = date.getFullYear(),
        m = String(date.getMonth() + 1).padStart(2, '0'),
        d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function stripTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
