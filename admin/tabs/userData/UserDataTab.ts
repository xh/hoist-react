/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {jsonBlobPanel} from '@xh/hoist/admin/tabs/userData/jsonblob/JsonBlobPanel';
import {rolePanel} from '@xh/hoist/admin/tabs/userData/roles/RolePanel';
import {userPanel} from '@xh/hoist/admin/tabs/userData/users/UserPanel';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {userPreferencePanel} from './prefs/UserPreferencePanel';

export const userDataTab = hoistCmp.factory({
    render() {
        const conf = XH.getConf('xhAdminAppConfig', {});

        return tabContainer({
            modelConfig: {
                route: 'default.userData',
                switcher: {orientation: 'left', testId: 'user-data-tab-switcher'},
                refreshMode: 'onShowAlways',
                tabs: [
                    {
                        id: 'users',
                        icon: Icon.users(),
                        content: userPanel,
                        omit: conf['hideUsersTab']
                    },
                    {
                        id: 'roles',
                        icon: Icon.idBadge(),
                        content: rolePanel
                    },
                    {
                        id: 'prefs',
                        title: 'Preferences',
                        icon: Icon.bookmark(),
                        content: userPreferencePanel
                    },
                    {
                        id: 'jsonBlobs',
                        title: 'JSON Blobs',
                        icon: Icon.json(),
                        content: jsonBlobPanel
                    }
                ]
            }
        });
    }
});
