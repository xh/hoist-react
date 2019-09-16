/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH, hoistCmp, uses} from '@xh/hoist/core';
import {div, filler} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';
import './UpdateBar.scss';

import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';

/**
 * @private
 */
export const updateBar = hoistCmp.factory({
    model: uses(AppContainerModel),

    render({model}) {
        const {updateVersion} = model;

        if (!updateVersion) return null;

        return div({
            className: 'xh-update-bar',
            items: [
                Icon.rocket({size: 'lg'}),
                div('An update is available!'),
                filler(),
                button({
                    icon: Icon.refresh(),
                    text: updateVersion,
                    onClick: () => XH.reloadApp()
                })
            ]
        });
    }
});