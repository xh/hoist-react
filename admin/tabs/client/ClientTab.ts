/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {clientErrorsPanel} from '@xh/hoist/admin/tabs/client/errors/ClientErrorsPanel';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {clientsPanel} from './clients/ClientsPanel';

export const clientTab = hoistCmp.factory(() =>
    tabContainer({
        modelConfig: {
            route: 'default.clients',
            switcher: {orientation: 'left', testId: 'client-tab-switcher'},
            tabs: [
                {id: 'connections', icon: Icon.diff(), content: clientsPanel},
                {id: 'errors', icon: Icon.warning(), content: clientErrorsPanel}
            ]
        }
    })
);
