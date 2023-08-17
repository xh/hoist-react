import {PlainObject} from '@xh/hoist/core';
import {isString} from 'lodash';

export function getTestId(propsOrTestId: PlainObject | string, suffix?: string): string {
    const testId = isString(propsOrTestId) ? propsOrTestId : propsOrTestId?.testId;
    return testId && suffix ? `${testId}-${suffix}` : testId;
}
