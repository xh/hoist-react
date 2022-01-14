/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';
import {dockContainer} from '@xh/hoist/cmp/dock';
import {XH, hoistCmp, uses} from '@xh/hoist/core';

/**
 * Internal component to display a single instance of an app-wide dock container for the Admin Console.
 * @see {XH.openAdminConsole()}
 * @private
 */
export const adminDockContainer = hoistCmp.factory({
    displayName: 'AdminDockContainer',
    model: uses(AppContainerModel),

    render({model}) {
        if (!XH.getUser().isHoistAdmin) return null;

        return dockContainer();
    }
});
