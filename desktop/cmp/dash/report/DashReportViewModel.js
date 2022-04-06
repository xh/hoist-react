/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {DashViewModel} from '@xh/hoist/desktop/cmp/dash/DashViewModel';

/**
 * Model for a content item within a DashReport. Extends {@see DashViewModel}
 */
export class DashReportViewModel extends DashViewModel {
    get positionParams() {
        const {containerModel, id} = this;
        return containerModel.layout.find(view => view.i === id);
    }
}
