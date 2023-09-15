/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {ClusterTabModel} from '@xh/hoist/admin/tabs/cluster/ClusterTabModel';
import {HoistModel, LoadSpec, lookup, PlainObject, XH} from '@xh/hoist/core';
import {fmtDateTimeSec, fmtJson} from '@xh/hoist/format';
import {cloneDeep, forOwn, isNumber, isPlainObject} from 'lodash';

export class BaseInstanceModel extends HoistModel {
    @lookup(() => ClusterTabModel) parent: ClusterTabModel;

    get instanceName(): string {
        return this.parent.instanceName;
    }

    fmtStats(stats: PlainObject): string {
        stats = cloneDeep(stats);
        this.processDates(stats);
        return fmtJson(JSON.stringify(stats));
    }

    handleLoadException(e: unknown, loadSpec: LoadSpec) {
        const instanceNotFound = !this.isInstanceNotFound(e);
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
    private processDates(stats: PlainObject) {
        forOwn(stats, (v, k) => {
            if ((k.endsWith('Time') || k.endsWith('Date') || k == 'timestamp') && isNumber(v)) {
                stats[k] = v ? fmtDateTimeSec(v) : null;
            }
            if (isPlainObject(v)) {
                this.processDates(v);
            }
        });
    }
}
