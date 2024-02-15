/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HOURS} from '@xh/hoist/utils/datetime';
import {fmtNumber} from '@xh/hoist/format';

/**
 * @internal - pending additional support for a client-side Time Zone API.
 */
export function fmtTimeZone(name: string, offset: number): string {
    if (!name) return '';

    return name === 'GMT' || name === 'UTC'
        ? name
        : `${name} (GMT${fmtNumber(offset / HOURS, {withPlusSign: true, asHtml: true})})`;
}
