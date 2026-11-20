/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {LocalDate} from '@xh/hoist/utils/datetime';
import {dateRangePresets} from './DateRangePresets';
import type {DateRangeContext} from './Types';

/**
 * A context to resolve selections against without a {@link DateRangePickerModel}, such as on a
 * server-driven anchor date. Fills what is not given as the picker does: `today` from the
 * browser, no `minDate`, `maxDate` at the anchor, weekdays as business days, no business-day mode,
 * and Hoist's presets.
 */
export function dateRangeContext(
    config: Partial<DateRangeContext> & {anchorDate: LocalDate}
): DateRangeContext {
    const {anchorDate} = config;
    return {
        today: LocalDate.today(),
        minDate: null,
        maxDate: anchorDate,
        isBusinessDay: d => d.isWeekday,
        businessDayMode: false,
        presets: dateRangePresets,
        ...config
    };
}
