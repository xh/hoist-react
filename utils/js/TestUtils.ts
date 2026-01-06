/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistProps} from '@xh/hoist/core';
import {isString} from 'lodash';

export const TEST_ID = 'data-testid';

export function getTestId(propsOrTestId: HoistProps | string, suffix?: string): string {
    const testId = isString(propsOrTestId) ? propsOrTestId : propsOrTestId?.['testId'];
    return testId && suffix ? `${testId}-${suffix}` : testId;
}
