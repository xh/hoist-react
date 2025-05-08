/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {configPanel} from '@xh/hoist/admin/tabs/general/config/ConfigPanel';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {aboutPanel} from './about/AboutPanel';
import {alertBannerPanel} from './alertBanner/AlertBannerPanel';

export const generalTab = hoistCmp.factory(() =>
    tabContainer({
        modelConfig: {
            route: 'default.general',
            switcher: {orientation: 'left', testId: 'general-tab-switcher'},
            tabs: [
                {id: 'about', icon: Icon.info(), content: aboutPanel},
                {id: 'config', icon: Icon.settings(), content: configPanel},
                {id: 'alertBanner', icon: Icon.bullhorn(), content: alertBannerPanel}
            ]
        }
    })
);
