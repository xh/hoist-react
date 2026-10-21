/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {DateRangePickerLocalModel} from './DateRangePickerLocalModel';
import {div, hbox, span, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, type HoistProps} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {dateInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import type {LocalDate} from '@xh/hoist/utils/datetime';
import {getTestId} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {isString} from 'lodash';
import {clickable, dataAttrs} from './TabUtils';

/** Custom tab - start and end inputs over a two-month calendar, drafted until applied. */
export const customTab = hoistCmp.factory<DateRangePickerLocalModel>(({model, testId}) => {
    const {parentModel, minDate, maxDate, leftMonth, rightMonth} = model;

    const field = (edge: 'start' | 'end') =>
        vbox({
            className: classNames(
                'xh-date-range-picker-popover__field',
                model.nextEdge === edge && 'xh-date-range-picker-popover__field--armed'
            ),
            items: [
                div({
                    className: 'xh-date-range-picker-popover__field-label',
                    item: edge === 'start' ? 'Start' : 'End'
                }),
                dateInput({
                    value: edge === 'start' ? model.customStart : model.customEnd,
                    onCommit: v =>
                        edge === 'start' ? model.commitStartInput(v) : model.commitEndInput(v),
                    valueType: 'localDate',
                    // Inputs need a parseable string format - a function format cannot be typed into.
                    formatString: isString(parentModel.dateFormat)
                        ? parentModel.dateFormat
                        : 'YYYY-MM-DD',
                    enablePicker: false,
                    rightElement: null,
                    width: '100%',
                    minDate,
                    maxDate,
                    testId: getTestId(testId, `${edge}-input`)
                })
            ]
        });

    return vbox({
        className: 'xh-date-range-picker-popover__tab',
        items: [
            hbox({
                className: 'xh-date-range-picker-popover__custom-fields',
                items: [
                    field('start'),
                    Icon.arrowRight({className: 'xh-date-range-picker-popover__field-arrow'}),
                    field('end')
                ]
            }),
            hbox({
                className: 'xh-date-range-picker-popover__cal-nav',
                items: [
                    button({
                        className: 'xh-date-range-picker-popover__nav-btn',
                        icon: Icon.angleLeft(),
                        minimal: true,
                        disabled: !model.canCalBack,
                        testId: getTestId(testId, 'cal-back'),
                        onClick: () => model.stepCalendar(-1)
                    }),
                    span({
                        className: 'xh-date-range-picker-popover__cal-title',
                        item: leftMonth.format('MMMM YYYY')
                    }),
                    span({
                        className: 'xh-date-range-picker-popover__cal-title',
                        item: rightMonth.format('MMMM YYYY')
                    }),
                    button({
                        className: 'xh-date-range-picker-popover__nav-btn',
                        icon: Icon.angleRight(),
                        minimal: true,
                        disabled: !model.canCalForward,
                        testId: getTestId(testId, 'cal-forward'),
                        onClick: () => model.stepCalendar(1)
                    })
                ]
            }),
            hbox({
                className: 'xh-date-range-picker-popover__cals',
                items: [
                    calendarMonth({model, monthStart: leftMonth}),
                    calendarMonth({model, monthStart: rightMonth})
                ]
            })
        ]
    });
});

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface CalendarMonthProps extends HoistProps<DateRangePickerLocalModel> {
    monthStart: LocalDate;
}

const calendarMonth = hoistCmp.factory<CalendarMonthProps>(({model, monthStart}) => {
    const {customStart, customEnd} = model;

    return div({
        className: 'xh-date-range-picker-popover__cal',
        items: [
            div({
                className: 'xh-date-range-picker-popover__cal-dow',
                items: DOW_LABELS.map((it, idx) => span({key: idx, item: it}))
            }),
            ...buildWeeks(monthStart).map((week, wIdx) =>
                div({
                    key: wIdx,
                    className: 'xh-date-range-picker-popover__cal-week',
                    items: week.map((day, dIdx) => {
                        if (!day) {
                            return div({
                                key: dIdx,
                                className: 'xh-date-range-picker-popover__cal-cell'
                            });
                        }
                        const disabled = model.isDayDisabled(day),
                            edge = day === customStart || day === customEnd,
                            inRange = day > customStart && day < customEnd;
                        return div({
                            key: dIdx,
                            className: classNames(
                                'xh-date-range-picker-popover__cal-cell',
                                edge && 'xh-date-range-picker-popover__cal-cell--edge',
                                inRange && 'xh-date-range-picker-popover__cal-cell--in-range',
                                disabled && 'xh-date-range-picker-popover__cal-cell--disabled'
                            ),
                            ...dataAttrs({'data-date': day.isoString}),
                            item: day.format('D'),
                            ...clickable(disabled ? null : () => model.pickDay(day))
                        });
                    })
                })
            )
        ]
    });
});

function buildWeeks(monthStart: LocalDate): (LocalDate | null)[][] {
    const startOffset = monthStart.moment.day(),
        daysInMonth = monthStart.endOfMonth().diff(monthStart, 'days') + 1,
        cells: (LocalDate | null)[] = [];

    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 0; d < daysInMonth; d++) cells.push(monthStart.add(d, 'days'));
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
}
