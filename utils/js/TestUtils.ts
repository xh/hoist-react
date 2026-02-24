/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistProps} from '@xh/hoist/core';
import {isString} from 'lodash';

/**
 * HTML attribute name used to tag elements with stable test identifiers. Use as a computed
 * property key on element specs — e.g. `{[TEST_ID]: 'my-grid'}` — to emit a `data-testid`
 * attribute that automated test drivers can locate reliably.
 */
export const TEST_ID = 'data-testid';

/**
 * Derive a test ID string, optionally appending a `-suffix` for sub-elements within a
 * composite component. Accepts either a props object (reads its `testId` property) or a
 * raw string. Returns `undefined` when no testId is present, so the attribute is omitted
 * gracefully.
 *
 * @param propsOrTestId - component props containing a `testId`, or a testId string directly.
 * @param suffix - optional token appended as `${testId}-${suffix}` to identify a child element
 *      (e.g. `'clear-btn'`, `'filter'`, `'editor'`).
 */
export function getTestId(propsOrTestId: HoistProps | string, suffix?: string): string {
    const testId = isString(propsOrTestId) ? propsOrTestId : propsOrTestId?.['testId'];
    return testId && suffix ? `${testId}-${suffix}` : testId;
}
