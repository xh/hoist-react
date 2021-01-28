/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import './UpdateBar.scss';

/** @private */
export const updateBar = hoistCmp.factory({
    displayName: 'UpdateBar',
    model: uses(AppContainerModel),

    render({model}) {
        const {updateVersion} = model,
            className = 'xh-update-bar';

        if (!updateVersion) return null;

        return toolbar({
            className,
            items: [
                Icon.rocket({size: 'lg'}),
                div(`A new version of ${XH.clientAppName} is available!`),
                button({
                    icon: Icon.refresh(),
                    intent: 'primary',
                    minimal: false,
                    small: true,
                    marginLeft: 10,
                    text: `Update to ${updateVersion}`,
                    onClick: () => XH.reloadApp()
                })
            ]
        });
    }
});
