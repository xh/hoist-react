/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {InstancesTabModel} from '@xh/hoist/admin/tabs/cluster/instances/InstancesTabModel';
import {lookup, XH} from '@xh/hoist/core';
import {BaseAdminTabModel} from '@xh/hoist/admin/tabs/BaseAdminTabModel';

export class BaseInstanceModel extends BaseAdminTabModel {
    @lookup(() => InstancesTabModel) parent: InstancesTabModel;

    get instanceName(): string {
        return this.parent.instanceName;
    }

    override handleLoadException(e: unknown) {
        const instanceNotFound = this.isInstanceNotFound(e),
            connDown = this.parent.lastLoadException,
            {isVisible} = this;
        XH.handleException(e, {
            alertType: 'toast',
            showAlert: !instanceNotFound && !connDown && isVisible,
            logOnServer: !instanceNotFound && !connDown && isVisible
        });
    }

    //-------------------
    // Implementation
    //-------------------
    private isInstanceNotFound(e: unknown): boolean {
        return e['name'] == 'InstanceNotFoundException';
    }
}
