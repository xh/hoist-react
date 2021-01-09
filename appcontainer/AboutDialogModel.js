/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {table, tbody, td, th, tr} from '@xh/hoist/cmp/layout';
import {webSocketIndicator} from '@xh/hoist/cmp/websocket';
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';

/**
 * Support for About Dialog.
 *  @private
 */
@HoistModel
export class AboutDialogModel {

    @observable isOpen = false;

    init() {
        this.addReaction({
            track: () => XH.routerState,
            run: () => this.hide()
        });
    }

    @action
    show() {
        this.isOpen = true;
    }

    @action
    hide() {
        this.isOpen = false;
    }

    getTable() {
        const svc = XH.environmentService,
            row = (label, data) => tr(th(label), td(data)),
            configRows = [];

        XH.getConf('xhAboutMenuConfigs', []).forEach(it => {
            const confVal = XH.getConf(it.key, null);
            if (confVal !== null) configRows.push(row(it.label, confVal));
        });

        return table({
            item: tbody(
                row('App', `${svc.get('appName')} (${svc.get('appCode')})`),
                row('Current User', XH.identityService.username),
                row('Environment', svc.get('appEnvironment')),
                row('Server', `${svc.get('appVersion')} (build ${svc.get('appBuild')})`),
                row('Client', `${svc.get('clientVersion')} (build ${svc.get('clientBuild')})`),
                row('Hoist Core', svc.get('hoistCoreVersion')),
                row('Hoist React', svc.get('hoistReactVersion')),
                row('User Agent', window.navigator.userAgent),
                ...configRows,
                row('WebSockets', webSocketIndicator())
            )
        });
    }
}
