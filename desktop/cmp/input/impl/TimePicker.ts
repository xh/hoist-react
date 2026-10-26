/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hbox, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {consumeEvent} from '@xh/hoist/utils/js';
import {padStart} from 'lodash';
import './TimePicker.scss';

export interface TimePickerProps extends HoistProps {
    /** Date whose time is shown. When null, an edit sets the time on today's date. */
    value: Date;

    /** Fields to show - `minute` shows hours and minutes, `second` adds seconds. */
    precision: 'minute' | 'second';

    /** Called with a new Date carrying the edited time. */
    onChange: (date: Date) => void;
}

/**
 * A 24-hour time editor with a field per unit. Arrow keys adjust the focused field, which also
 * selects its contents on focus so a typed value replaces it. Shown below the calendar in the
 * desktop DateInput popover when `timePrecision` is set.
 */
export const timePicker = hoistCmp.factory<TimePickerProps>({
    displayName: 'TimePicker',
    className: 'xh-time-picker',
    model: false,

    render({className, value, precision, onChange}) {
        const units = precision === 'second' ? UNITS : UNITS.slice(0, 2),
            items = [];

        units.forEach((unit, idx) => {
            if (idx) items.push(span({className: 'xh-time-picker__separator', item: ':'}));
            items.push(timeField({unit, value, onChange}));
        });

        return hbox({className, items});
    }
});

//------------------
// Implementation
//------------------
interface TimeUnit {
    name: 'hour' | 'minute' | 'second';
    max: number;
    get: (date: Date) => number;
    set: (date: Date, val: number) => void;
}

const UNITS: TimeUnit[] = [
    {name: 'hour', max: 23, get: d => d.getHours(), set: (d, v) => d.setHours(v)},
    {name: 'minute', max: 59, get: d => d.getMinutes(), set: (d, v) => d.setMinutes(v)},
    {name: 'second', max: 59, get: d => d.getSeconds(), set: (d, v) => d.setSeconds(v)}
];

const timeField = hoistCmp.factory<{unit: TimeUnit} & Omit<TimePickerProps, 'precision'>>({
    model: false,

    render({unit, value, onChange}) {
        const current = value ? unit.get(value) : 0,
            change = (val: number) => {
                // Edits with no date yet selected apply to today.
                const date = value ? new Date(value) : new Date(new Date().setHours(0, 0, 0, 0));
                unit.set(date, val);
                onChange(date);
            };

        return textInput({
            className: `xh-time-picker__field xh-time-picker__field--${unit.name}`,
            value: padStart(String(current), 2, '0'),
            selectOnFocus: true,
            textAlign: 'center',
            width: 32,
            domAttrs: {'aria-label': unit.name},
            onCommit: str => {
                const val = parseInt(str, 10);
                if (val >= 0 && val <= unit.max) change(val);
            },
            onKeyDown: ev => {
                if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
                const delta = ev.key === 'ArrowUp' ? 1 : -1;
                change((current + delta + unit.max + 1) % (unit.max + 1));
                consumeEvent(ev);
            }
        });
    }
});
