/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import {Icon} from '@xh/hoist/icon';
import {AboutDialogModel} from '@xh/hoist/appcontainer/AboutDialogModel';

import './AboutDialog.scss';

/**
 * A dialog box showing basic metadata and version information about the Hoist application
 * and its plugins. Can also display the values of other soft-configuration entries as
 * specified by the xhAboutMenuConfigs configuration key.
 *
 * @private
 */
export const aboutDialog = hoistCmp.factory({
    displayName: 'AboutDialog',
    model: uses(AboutDialogModel),

    render({model}) {
        if (!model.isOpen) return null;

        return dialog({
            icon: Icon.info(),
            title: `About ${XH.appName}`,
            className: 'xh-about-dialog',
            isOpen: true,
            onCancel: () => model.hide(),
            content: model.getTable()
        });
    }
});