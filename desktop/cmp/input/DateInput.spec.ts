/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {dateInput, DateInputProps} from '@xh/hoist/desktop/cmp/input';
import {bindable} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {fireEvent, render, waitFor} from '@testing-library/react';
import moment from 'moment';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * What the desktop DateInput's calendar popover commits to its model. The popover hosts a
 * react-day-picker calendar, Hoist's own time picker and an optional Today/Clear bar, and the
 * input's contract is which value each of those commits and when the popover closes.
 */
beforeAll(async () => {
    await initTestAppAsync();
});

describe('DateInput', () => {
    describe('calendar', () => {
        it('commits the picked day at midnight and closes the popover', async () => {
            const {model} = await openPickerAsync({value: new Date(2026, 9, 10, 15, 30)});

            fireEvent.click(dayButton('2026-10-15'));

            expect(model.value).toEqual(new Date(2026, 9, 15));
            await waitFor(() => expect(calendar()).toBeNull());
        });

        it('keeps the value when the selected day is clicked again', async () => {
            const {model} = await openPickerAsync({value: new Date(2026, 9, 10)});

            fireEvent.click(dayButton('2026-10-10'));

            expect(model.value).toEqual(new Date(2026, 9, 10));
        });

        it('keeps the popover open and the time when timePrecision is set', async () => {
            const {model} = await openPickerAsync({
                value: new Date(2026, 9, 10, 15, 30),
                timePrecision: 'minute'
            });

            fireEvent.click(dayButton('2026-10-15'));

            expect(model.value).toEqual(new Date(2026, 9, 15, 15, 30));
            expect(calendar()).not.toBeNull();
        });

        it('disables days outside minDate and maxDate and limits navigation to them', async () => {
            await openPickerAsync({
                value: new Date(2026, 9, 10),
                minDate: new Date(2026, 9, 5),
                maxDate: new Date(2026, 9, 20)
            });

            expect(dayButton('2026-10-04').disabled).toBe(true);
            expect(dayButton('2026-10-05').disabled).toBe(false);
            expect(dayButton('2026-10-20').disabled).toBe(false);
            expect(dayButton('2026-10-21').disabled).toBe(true);
            expect(isDisabled(navButton('previous'))).toBe(true);
            expect(isDisabled(navButton('next'))).toBe(true);
        });

        it('merges app-provided disabled matchers with the bounds', async () => {
            await openPickerAsync({
                value: new Date(2026, 9, 10),
                minDate: new Date(2026, 9, 5),
                dayPickerProps: {disabled: {dayOfWeek: [0, 6]}}
            });

            expect(dayButton('2026-10-04').disabled).toBe(true); // before minDate
            expect(dayButton('2026-10-11').disabled).toBe(true); // a Sunday
            expect(dayButton('2026-10-12').disabled).toBe(false);
        });

        it('opens on the month of the value', async () => {
            await openPickerAsync({value: new Date(2024, 1, 10)});
            expect(dayButton('2024-02-10')).not.toBeNull();
        });

        it('opens on the nearest bound when there is no value and today is out of bounds', async () => {
            const max = moment().subtract(2, 'years').startOf('day');
            await openPickerAsync({maxDate: max.toDate()});
            expect(dayButton(max.format('YYYY-MM-DD'))).not.toBeNull();
        });
    });

    describe('value types', () => {
        it('publishes a LocalDate when valueType is localDate', async () => {
            const {model} = await openPickerAsync({
                value: LocalDate.get('2026-10-10'),
                valueType: 'localDate'
            });

            fireEvent.click(dayButton('2026-10-15'));

            expect(model.value).toEqual(LocalDate.get('2026-10-15'));
        });

        it('ignores timePrecision when valueType is localDate', async () => {
            const {model} = await openPickerAsync({
                value: LocalDate.get('2026-10-10'),
                valueType: 'localDate',
                timePrecision: 'minute'
            });

            expect(timeField('hour')).toBeNull();
            fireEvent.click(dayButton('2026-10-15'));
            expect(model.value).toEqual(LocalDate.get('2026-10-15'));
            await waitFor(() => expect(calendar()).toBeNull());
        });
    });

    describe('time picker', () => {
        it('shows hours and minutes for minute precision, and seconds for second precision', async () => {
            await openPickerAsync({value: new Date(2026, 9, 10, 9, 5), timePrecision: 'minute'});
            expect(timeField('hour').value).toBe('09');
            expect(timeField('minute').value).toBe('05');
            expect(timeField('second')).toBeNull();

            await openPickerAsync({
                value: new Date(2026, 9, 10, 9, 5, 7),
                timePrecision: 'second'
            });
            expect(timeField('second').value).toBe('07');
        });

        it('commits a typed field into the selected date', async () => {
            const {model} = await openPickerAsync({
                value: new Date(2026, 9, 10, 9, 5),
                timePrecision: 'minute'
            });

            fireEvent.change(timeField('hour'), {target: {value: '18'}});
            fireEvent.keyDown(timeField('hour'), {key: 'Enter'});

            expect(model.value).toEqual(new Date(2026, 9, 10, 18, 5));
            expect(calendar()).not.toBeNull();
        });

        it('reverts a field typed out of range', async () => {
            const {model} = await openPickerAsync({
                value: new Date(2026, 9, 10, 9, 5),
                timePrecision: 'minute'
            });

            fireEvent.change(timeField('minute'), {target: {value: '75'}});
            fireEvent.keyDown(timeField('minute'), {key: 'Enter'});

            expect(model.value).toEqual(new Date(2026, 9, 10, 9, 5));
            expect(timeField('minute').value).toBe('05');
        });

        it('steps the focused field with the arrow keys, wrapping at the bounds', async () => {
            const {model} = await openPickerAsync({
                value: new Date(2026, 9, 10, 23, 0),
                timePrecision: 'minute'
            });

            fireEvent.keyDown(timeField('hour'), {key: 'ArrowUp'});
            expect(model.value).toEqual(new Date(2026, 9, 10, 0, 0));

            fireEvent.keyDown(timeField('minute'), {key: 'ArrowDown'});
            expect(model.value).toEqual(new Date(2026, 9, 10, 0, 59));
        });

        it('applies a time edit to today when no date is selected', async () => {
            const {model} = await openPickerAsync({timePrecision: 'minute'});

            fireEvent.keyDown(timeField('hour'), {key: 'ArrowUp'});

            const expected = new Date();
            expected.setHours(1, 0, 0, 0);
            expect(model.value).toEqual(expected);
        });
    });

    describe('actions bar', () => {
        it('renders Today and Clear only when showActionsBar is set', async () => {
            await openPickerAsync({value: new Date(2026, 9, 10)});
            expect(actionButton('Today')).toBeNull();

            await openPickerAsync({value: new Date(2026, 9, 10), showActionsBar: true});
            expect(actionButton('Today')).not.toBeNull();
            expect(actionButton('Clear')).not.toBeNull();
        });

        it('selects today and closes on Today', async () => {
            const {model} = await openPickerAsync({
                value: new Date(2026, 9, 10),
                showActionsBar: true
            });

            fireEvent.click(actionButton('Today'));

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            expect(model.value).toEqual(today);
            await waitFor(() => expect(calendar()).toBeNull());
        });

        it('disables Today when today is out of bounds', async () => {
            await openPickerAsync({
                maxDate: moment().subtract(1, 'year').toDate(),
                showActionsBar: true
            });

            expect(actionButton('Today').disabled).toBe(true);
        });

        it('clears the value and closes on Clear', async () => {
            const {model} = await openPickerAsync({
                value: new Date(2026, 9, 10),
                showActionsBar: true
            });

            fireEvent.click(actionButton('Clear'));

            expect(model.value).toBeNull();
            await waitFor(() => expect(calendar()).toBeNull());
        });

        it('keeps the popover open after Today when timePrecision is set', async () => {
            await openPickerAsync({
                value: new Date(2026, 9, 10),
                timePrecision: 'minute',
                showActionsBar: true
            });

            fireEvent.click(actionButton('Today'));

            expect(calendar()).not.toBeNull();
        });
    });
});

//------------------
// Helpers
//------------------
class FormModel extends HoistModel {
    @bindable accessor value: Date | LocalDate = null;
}

// Renders one input at a time, so the document-wide queries below see a single popover.
let rendered: ReturnType<typeof render> = null;

async function openPickerAsync(props: Partial<DateInputProps>) {
    rendered?.unmount();
    const model = new FormModel();
    model.value = props.value ?? null;
    onTestFinished(() => model.destroy());

    rendered = render(dateInput({model, bind: 'value', ...props}));
    const {container} = rendered;
    onTestFinished(() => {
        rendered?.unmount();
        rendered = null;
    });

    fireEvent.click(container.querySelector('.xh-date-input__picker-icon'));
    await waitFor(() => expect(calendar()).not.toBeNull());
    return {model, container};
}

function calendar(): HTMLElement {
    return document.querySelector('.rdp-root');
}

function dayButton(day: string): HTMLButtonElement {
    return document.querySelector(`.rdp-day[data-day="${day}"] button`);
}

function navButton(dir: 'previous' | 'next'): HTMLButtonElement {
    return document.querySelector(`.rdp-button_${dir}`);
}

function timeField(unit: 'hour' | 'minute' | 'second'): HTMLInputElement {
    return document.querySelector(`.xh-time-picker__field--${unit} input`);
}

function actionButton(text: string): HTMLButtonElement {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.xh-date-input__actions button');
    return Array.from(buttons).find(it => it.textContent === text) ?? null;
}

// react-day-picker marks its nav buttons with aria-disabled rather than the disabled attribute.
function isDisabled(btn: HTMLButtonElement): boolean {
    return btn.disabled || btn.getAttribute('aria-disabled') === 'true';
}
