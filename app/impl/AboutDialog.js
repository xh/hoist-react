/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, hoistComponent, hoistModel, elemFactory} from 'hoist/core';
import {frame, table, tbody, tr, th, td, filler} from 'hoist/layout';
import {toolbar} from 'hoist/cmp/toolbar';
import {dialog, button} from 'hoist/kit/blueprint';
import './AboutDialog.scss';

@hoistComponent()
export class AboutDialog extends Component {
    render() {
        return dialog({
            isOpen: this.props.isOpen,
            isCloseButtonShown: false,
            icon: 'info-sign',
            cls: 'xh-about-dialog',
            title: `About ${XH.appName}`,
            style: {width: 350},
            items: [
                frame({
                    cls: 'xh-about-dialog__inner',
                    item: this.renderTable()
                }),
                toolbar({
                    items: [
                        filler(),
                        button({
                            text: 'OK',
                            onClick: this.onClose
                        })
                    ]
                })
            ],
            onClose: this.onClose
        });
    }

    renderTable() {
        const svc = XH.environmentService,
            row = (label, data) => tr(th(label), td(data)),
            configRows = XH.getConf('xhAboutMenuConfigs', []).map(it => {
                return row(it.label, XH.getConf(it.key, ''));
            });

        return table({
            item: tbody(
                row('App Name', XH.appName),
                row('Environment', svc.get('appEnvironment')),
                row('App Version', svc.get('appVersion')),
                row('Hoist Core Version', svc.get('hoistCoreVersion')),
                row('Hoist React Version', svc.get('hoistReactVersion')),
                ...configRows
            )
        });
    }

    onClose = () => {
        hoistModel.setShowAbout(false);
    }
}
export const aboutDialog = elemFactory(AboutDialog);