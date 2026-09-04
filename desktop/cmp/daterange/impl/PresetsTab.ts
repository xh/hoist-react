/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {getDateRangePresetName} from '@xh/hoist/cmp/daterange';
import type {DateRangePickerLocalModel} from './DateRangePickerLocalModel';
import {div, span, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {getTestId, TEST_ID} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {clickable, dataAttrs, sectionHeader} from './TabUtils';

/** Presets tab - one row per configured preset, committing on click. */
export const presetsTab = hoistCmp.factory<DateRangePickerLocalModel>(({model, testId}) => {
    const {parentModel, singleTab} = model,
        {value, context} = parentModel;

    return vbox({
        className: 'xh-date-range-picker-popover__tab',
        items: [
            sectionHeader('Presets'),
            ...parentModel.presets.map(preset => {
                const {token} = preset,
                    selected = value.kind === 'preset' && value.token === token,
                    range = parentModel.resolve({kind: 'preset', token}).current;
                return div({
                    key: token,
                    className: classNames(
                        'xh-date-range-picker-popover__preset-row',
                        selected && 'xh-date-range-picker-popover__preset-row--selected'
                    ),
                    ...dataAttrs({[TEST_ID]: getTestId(testId, `preset-${token}`)}),
                    ...clickable(() => model.commit({kind: 'preset', token})),
                    items: [
                        Icon.check({
                            className: classNames(
                                'xh-date-range-picker-popover__row-check',
                                !selected && 'xh-date-range-picker-popover__row-check--hidden'
                            )
                        }),
                        span({
                            className: 'xh-date-range-picker-popover__row-name',
                            item: getDateRangePresetName(preset, context)
                        }),
                        span({
                            omit: singleTab,
                            className: 'xh-date-range-picker-popover__row-range',
                            item: parentModel.fmtRange(range)
                        })
                    ]
                });
            })
        ]
    });
});
