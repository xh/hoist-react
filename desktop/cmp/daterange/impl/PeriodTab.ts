/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {DateRangePickerLocalModel} from './DateRangePickerLocalModel';
import {div, filler, hbox, span, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, type Intent} from '@xh/hoist/core';
import {button, type ButtonProps} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {getTestId} from '@xh/hoist/utils/js';
import {sectionHeader} from './TabUtils';

/** Period tab - a year of months, each quarter alongside its months, and the year itself. */
const MONTH_LABELS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
];

export const periodTab = hoistCmp.factory<DateRangePickerLocalModel>(({model, testId}) => {
    const {parentModel, gridYear} = model,
        {value} = parentModel,
        yearRange = parentModel.resolve({kind: 'year', year: gridYear}).current,
        yearSelected = value.kind === 'year' && value.year === gridYear;

    return vbox({
        className: 'xh-date-range-picker-popover__tab',
        items: [
            hbox({
                className: 'xh-date-range-picker-popover__month-hdr',
                items: [
                    sectionHeader('Months & Years'),
                    filler(),
                    button({
                        className: 'xh-date-range-picker-popover__nav-btn',
                        icon: Icon.angleLeft(),
                        minimal: true,
                        disabled: !model.canYearBack,
                        testId: getTestId(testId, 'year-back'),
                        onClick: () => model.stepYear(-1)
                    }),
                    span({
                        className: 'xh-date-range-picker-popover__year-val',
                        item: String(gridYear)
                    }),
                    button({
                        className: 'xh-date-range-picker-popover__nav-btn',
                        icon: Icon.angleRight(),
                        minimal: true,
                        disabled: !model.canYearForward,
                        testId: getTestId(testId, 'year-forward'),
                        onClick: () => model.stepYear(1)
                    })
                ]
            }),
            div({
                // One row per quarter: its three months, then the quarter itself - so the quarter
                // labels the months it contains, and both are a click away.
                className: 'xh-date-range-picker-popover__month-grid',
                items: [1, 2, 3, 4].flatMap(quarter => {
                    const quarterActive =
                            value.kind === 'quarter' &&
                            value.quarter === quarter &&
                            value.year === gridYear,
                        months = [quarter * 3 - 2, quarter * 3 - 1, quarter * 3];
                    return [
                        ...months.map(month => {
                            const active =
                                value.kind === 'month' &&
                                value.month === month &&
                                value.year === gridYear;
                            return button({
                                key: month,
                                className: 'xh-date-range-picker-popover__month-btn',
                                text: MONTH_LABELS[month - 1],
                                ...selectableProps(active, model.intent),
                                disabled: model.isMonthDisabled(month),
                                testId: getTestId(testId, `month-${month}`),
                                onClick: () => model.commit({kind: 'month', year: gridYear, month})
                            });
                        }),
                        button({
                            key: `q${quarter}`,
                            className: 'xh-date-range-picker-popover__quarter-btn',
                            text: `Q${quarter}`,
                            ...selectableProps(quarterActive, model.intent),
                            disabled: model.isQuarterDisabled(quarter),
                            testId: getTestId(testId, `quarter-${quarter}`),
                            onClick: () => model.commit({kind: 'quarter', year: gridYear, quarter})
                        })
                    ];
                })
            }),
            button({
                className: 'xh-date-range-picker-popover__year-row',
                ...selectableProps(yearSelected, model.intent),
                disabled: !model.yearSelectable,
                testId: getTestId(testId, 'year-row'),
                onClick: () => model.commit({kind: 'year', year: gridYear}),
                items: [
                    Icon.calendar(),
                    span({
                        className: 'xh-date-range-picker-popover__year-row-label',
                        item: String(gridYear)
                    }),
                    span({
                        // As on the Presets tab - the single-tab popover is too narrow for dates.
                        omit: model.singleTab,
                        className: 'xh-date-range-picker-popover__row-range',
                        item: parentModel.fmtRange(yearRange)
                    })
                ]
            })
        ]
    });
});

/**
 * Button props for a selectable period: a solid accent fill when selected (Hoist buttons are
 * minimal by default, so that needs `minimal: false` too), outlined otherwise.
 */
const selectableProps = (active: boolean, intent: Intent): Partial<ButtonProps> => ({
    outlined: !active,
    minimal: !active,
    active,
    intent: active ? (intent ?? 'primary') : undefined
});
