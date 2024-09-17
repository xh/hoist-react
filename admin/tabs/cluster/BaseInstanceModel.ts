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
import {createRef} from 'react';
import {isDisplayed} from '@xh/hoist/utils/js';

export class BaseInstanceModel extends HoistModel {
    viewRef = createRef<HTMLElement>();

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
        const instanceNotFound = this.isInstanceNotFound(e),
            connDown = this.parent.lastLoadException,
            {isVisible} = this,
            {isAutoRefresh} = loadSpec;
        XH.handleException(e, {
            alertType: 'toast',
            showAlert: !instanceNotFound && !connDown && isVisible,
            logOnServer: !instanceNotFound && !connDown && isVisible && !isAutoRefresh
        });
    }

    get isVisible() {
        return isDisplayed(this.viewRef.current);
    }

    //-------------------
    // Implementation
    //-------------------
    private isInstanceNotFound(e: unknown): boolean {
        return e['name'] == 'InstanceNotFoundException';
    }

    private processTimestamps(stats: PlainObject) {
        forOwn(stats, (v, k) => {
            // Convert numbers that look like recent timestamps to date values.
            if (
                (k.endsWith('Time') ||
                    k.endsWith('Date') ||
                    k.endsWith('Timestamp') ||
                    k == 'timestamp') &&
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
