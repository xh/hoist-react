/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, HoistComponent, elemFactory} from '@xh/hoist/core';
import {frame, table, tbody, tr, th, td, filler} from '@xh/hoist/cmp/layout';
import {toolbar} from '@xh/hoist/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {dialog, button} from '@xh/hoist/kit/blueprint';
import './AboutDialog.scss';

/**
 * A dialog box showing basic metadata and version information about the Hoist application
 * and its plugins. Can also display the values of other soft-configuration entries as
 * specified by the xhAboutMenuConfigs configuration key.
 *
 * @private
 */
@HoistComponent()
export class AboutDialog extends Component {

    render() {
        if (!XH.aboutIsOpen) return null;

        return dialog({
            isOpen: true,
            isCloseButtonShown: false,
            icon: Icon.info({size: 'lg'}),
            cls: 'xh-about-dialog',
            title: `About ${XH.appName}`,
            style: {width: 450},
            items: [
                frame({
                    cls: 'xh-about-dialog__inner',
                    item: this.renderTable()
                }),
                toolbar({
                    items: [
                        filler(),
                        button({
                            text: 'Close',
                            intent: 'primary',
                            onClick: this.onClose
                        })
                    ]
                })
            ],
            onClose: this.onClose
        });
    }


    //------------------------
    // Implementation
    //------------------------
    renderTable() {
        const svc = XH.environmentService,
            row = (label, data) => tr(th(label), td(data)),
            configRows = XH.getConf('xhAboutMenuConfigs', []).map(it => {
                return row(it.label, XH.getConf(it.key, ''));
            });

        return table({
            item: tbody(
                row('App', `${svc.get('appName')} (${svc.get('appCode')})`),
                row('Current User', XH.identityService.username),
                row('Environment', svc.get('appEnvironment')),
                row('Server', svc.get('appVersion')),
                row('Client', svc.get('clientVersion')),
                row('Hoist Core', svc.get('hoistCoreVersion')),
                row('Hoist React', svc.get('hoistReactVersion')),
                row('Build', svc.get('clientBuild')),
                row('User Agent', navigator.userAgent),
                ...configRows
            )
        });
    }

    onClose = () => {
        XH.hideAbout();
    }
}
export const aboutDialog = elemFactory(AboutDialog);