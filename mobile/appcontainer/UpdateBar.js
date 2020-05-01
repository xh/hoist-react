/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';
import {div, filler} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import {truncate} from 'lodash';
import './UpdateBar.scss';

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
                div('Update available!'),
                filler(),
                button({
                    icon: Icon.refresh(),
                    text: truncate(updateVersion, {length: 20}),
                    onClick: () => XH.reloadApp()
                })
            ]
        });
    }
});