/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {ClusterTabModel} from '@xh/hoist/admin/tabs/cluster/ClusterTabModel';
import {HoistModel, LoadSpec, lookup, PlainObject, XH} from '@xh/hoist/core';
import {fmtDateTimeSec, fmtJson} from '@xh/hoist/format';
import {DAYS} from '@xh/hoist/utils/datetime';
import {cloneDeep, forOwn, isArray, isNumber, isPlainObject} from 'lodash';

export class BaseInstanceModel extends HoistModel {
    @lookup(() => ClusterTabModel) parent: ClusterTabModel;

    get instanceName(): string {
        return this.parent.instanceName;
    }

    fmtStats(stats: PlainObject): string {
        stats = cloneDeep(stats);
        this.processTimestamps(stats);
        return fmtJson(JSON.stringify(stats));
    }

    handleLoadException(e: unknown, loadSpec: LoadSpec) {
        const instanceNotFound = this.isInstanceNotFound(e);
        XH.handleException(e, {
            showAlert: !loadSpec.isAutoRefresh && !instanceNotFound,
            logOnServer: !instanceNotFound
        });
    }

    isInstanceNotFound(e: unknown): boolean {
        return e['name'] == 'InstanceNotFoundException';
    }

    //-------------------
    // Implementation
    //-------------------
    private processTimestamps(stats: PlainObject) {
        forOwn(stats, (v, k) => {
            // Convert numbers that look like recent timestamps to date values.
            if (
                (k.endsWith('Time') || k.endsWith('Date') || k == 'timestamp') &&
                isNumber(v) &&
                v > Date.now() - 365 * DAYS
            ) {
                stats[k] = v ? fmtDateTimeSec(v, {fmt: 'MMM DD HH:mm:ss'}) : null;
            }
            if (isPlainObject(v) || isArray(v)) {
                this.processTimestamps(v);
            }
        });
    }
}
