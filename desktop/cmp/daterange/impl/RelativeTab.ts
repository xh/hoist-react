/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {DATE_RANGE_UNITS, getDateRangeUnitLabel} from '@xh/hoist/cmp/daterange';
import type {DateRangePickerLocalModel} from './DateRangePickerLocalModel';
import {div, hbox, span, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {numberInput, segmentedControl} from '@xh/hoist/desktop/cmp/input';
import {controlGroup} from '@xh/hoist/kit/blueprint';
import {getTestId} from '@xh/hoist/utils/js';
import {sectionHeader} from './TabUtils';

/** Relative tab - a lookback of N units ending on the anchor date, drafted until applied. */
export const relativeTab = hoistCmp.factory<DateRangePickerLocalModel>(({model, testId}) => {
    const {parentModel, relativeRange} = model;

    return vbox({
        className: 'xh-date-range-picker-popover__tab',
        items: [
            sectionHeader('Relative Lookback'),
            hbox({
                className: 'xh-date-range-picker-popover__rel-row',
                items: [
                    span({className: 'xh-date-range-picker-popover__rel-last', item: 'Last'}),
                    controlGroup({
                        items: [
                            button({
                                text: '−',
                                minWidth: 20,
                                testId: getTestId(testId, 'count-down'),
                                onClick: () => model.stepCount(-1)
                            }),
                            numberInput({
                                model,
                                bind: 'relativeCount',
                                min: 1,
                                max: 999,
                                width: 56,
                                textAlign: 'center',
                                commitOnChange: true,
                                testId: getTestId(testId, 'count')
                            }),
                            button({
                                text: '+',
                                minWidth: 20,
                                testId: getTestId(testId, 'count-up'),
                                onClick: () => model.stepCount(1)
                            })
                        ]
                    }),
                    segmentedControl({
                        model,
                        bind: 'relativeUnit',
                        testId: getTestId(testId, 'unit'),
                        options: DATE_RANGE_UNITS.map(unit => ({
                            value: unit,
                            label: getDateRangeUnitLabel(unit)
                        }))
                    })
                ]
            }),
            div({
                className: 'xh-date-range-picker-popover__snap-box',
                items: [
                    // Two ways of counting, named as peers rather than as a checkbox modifier.
                    // Days have nothing to round out, so no choice at that grain.
                    segmentedControl({
                        omit: !model.snapApplies,
                        model,
                        bind: 'relativeSnap',
                        fill: false,
                        testId: getTestId(testId, 'snap'),
                        options: [
                            {value: false, label: 'Rolling'},
                            {value: true, label: 'Calendar'}
                        ]
                    }),
                    div({
                        className: 'xh-date-range-picker-popover__snap-help',
                        item: model.relativeModeHelpText
                    })
                ]
            }),
            div({
                className: 'xh-date-range-picker-popover__preview',
                items: [
                    div({
                        className: 'xh-date-range-picker-popover__preview-label',
                        item: 'Resolves To'
                    }),
                    div({
                        className: 'xh-date-range-picker-popover__preview-range',
                        item: parentModel.fmtRange(relativeRange)
                    }),
                    div({
                        className: 'xh-date-range-picker-popover__preview-days',
                        item: model.relativePreviewCountText
                    })
                ]
            })
        ]
    });
});
