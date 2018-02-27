/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, hoistComponent, hoistModel, elemFactory} from 'hoist/core';
import {table, tbody, tr, th, td} from 'hoist/layout';
import {dialog, button} from 'hoist/kit/blueprint';
import './AboutDialog.css';

@hoistComponent()
export class AboutDialog extends Component {
    render() {
        return dialog({
            isOpen: this.props.isOpen,
            icon: 'info-sign',
            cls: `xh-about-dialog${hoistModel.darkTheme ? ' xh-dark' : ''}`,
            title: `About ${XH.appName}`,
            items: [
                this.renderTable(),
                button({text: 'OK', onClick: this.onClose})
            ],
            onClose: this.onClose
        });
    }

    renderTable() {
        const svc = XH.environmentService,
            row = (label, data) => tr(th(label), td(data)),
            configRows = XH.getConf('xhAboutMenuConfigs', []).map(it => {
                try {
                    return row(it.label, XH.getConf(it.key));
                } catch (e) {
                    console.warn('Error while getting config: ', e);
                }

                return false;
            });

        return table({
            cls: 'xh-about-table',
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