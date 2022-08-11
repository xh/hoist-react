/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HOURS} from '@xh/hoist/utils/datetime';
import {fmtNumber} from '@xh/hoist/format';

/**
 * @private Pending additional support for client-side Time zone API
 * @param {string} name
 * @param {number} offset
 * @return {string}
 */
export function fmtTimeZone(name, offset) {
    if (!name) return '';

    return name !== 'GMT' ?
        `${name} (GMT${fmtNumber(offset/HOURS, {withPlusSign: true, asHtml: true})})` :
        `${name}`;
}
