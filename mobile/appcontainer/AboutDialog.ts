/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {AboutDialogModel} from '@xh/hoist/appcontainer/AboutDialogModel';
import {filler} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import './AboutDialog.scss';
import {dialogPanel} from '@xh/hoist/mobile/cmp/panel';

/**
 * A dialog box showing basic metadata and version information about the Hoist application
 * and its plugins. Can also display the values of other soft-configuration entries as
 * specified by the xhAboutMenuConfigs configuration key.
 *
 * @internal
 */
export const aboutDialog = hoistCmp.factory({
    displayName: 'AboutDialog',
    model: uses(AboutDialogModel),

    render({model}) {
        return dialogPanel({
            icon: Icon.info(),
            title: `About ${XH.appName}`,
            className: 'xh-about-dialog',
            item: model.getTable(),
            isOpen: model.isOpen,
            bbar: [
                button({
                    text: 'Send Client Health Report',
                    icon: Icon.health(),
                    omit: !XH.trackService.enabled,
                    onClick: async () => {
                        try {
                            XH.clientHealthService.sendReport({trackOpts: {severity: 'INFO'}});
                            await XH.trackService.pushPendingAsync();
                            XH.successToast({
                                message: 'Client health report submitted.',
                                timeout: 2000
                            });
                        } catch (e) {
                            XH.handleException('Error sending client health report', e);
                        }
                    }
                }),
                filler(),
                button({
                    text: 'Close',
                    outlined: true,
                    onClick: () => model.hide()
                })
            ]
        });
    }
});
