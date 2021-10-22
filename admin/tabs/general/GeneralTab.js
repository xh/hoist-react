/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {configPanel} from '@xh/hoist/admin/tabs/general/config/ConfigPanel';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {aboutPanel} from './about/AboutPanel';
import {alertBannerPanel} from './alertBanner/AlertBannerPanel';
import {userPanel} from './users/UserPanel';


export const generalTab = hoistCmp.factory(
    () => tabContainer({
        model: {
            route: 'default.general',
            switcher: {orientation: 'left'},
            tabs: [
                {id: 'about', icon: Icon.info(), content: aboutPanel},
                {id: 'config', icon: Icon.settings(), content: configPanel},
                {id: 'users', icon: Icon.users(), content: userPanel},
                {id: 'alertBanner', icon: Icon.bullhorn(), content: alertBannerPanel}
            ]
        }
    })
);
