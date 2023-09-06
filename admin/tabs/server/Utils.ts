/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {ColumnSpec, dateTimeSec} from '@xh/hoist/cmp/grid';
import {PlainObject} from '@xh/hoist/core';
import {dateTimeRenderer, fmtDateTimeSec, fmtJson} from '@xh/hoist/format';
import {forOwn, isNumber, isPlainObject, cloneDeep} from 'lodash';

export function fmtStats(stats: PlainObject): string {
    stats = cloneDeep(stats);
    processDates(stats);
    return fmtJson(JSON.stringify(stats));
}

function processDates(stats: PlainObject) {
    forOwn(stats, (v, k) => {
        if ((k.endsWith('Time') || k.endsWith('Date') || k == 'timestamp') && isNumber(v)) {
            stats[k] = v ? fmtDateTimeSec(v) : null;
        }
        if (isPlainObject(v)) {
            processDates(v);
        }
    });
}

export const adminDateTimeSec: ColumnSpec = {
    ...dateTimeSec,
    renderer: dateTimeRenderer({fmt: 'MM-DD h:mm:ssa'})
};
