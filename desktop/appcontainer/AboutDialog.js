/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {AboutDialogModel} from '@xh/hoist/appcontainer/AboutDialogModel';
import {filler, frame} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
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

        const onClose = () => model.hide();

        return dialog({
            isOpen: true,
            title: `About ${XH.appName}`,
            icon: Icon.info({size: 'lg'}),
            className: 'xh-about-dialog',
            style: {width: 450},
            items: [
                frame({
                    className: 'xh-about-dialog__inner',
                    item: model.getTable()
                }),
                toolbar(
                    filler(),
                    button({
                        text: 'Close',
                        intent: 'primary',
                        onClick: onClose
                    })
                )
            ],
            onClose
        });
    }
});
