/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Children, Component} from 'react';
import {observable, observer, setter} from '@xh/hoist/mobx';
import {elemFactory, AppState, XH} from '@xh/hoist/core';
import {div, frame, vframe, viewport, vspacer} from '@xh/hoist/cmp/layout';
import {loadMask} from '@xh/hoist/mobile/cmp/mask';
import {messageSource} from '@xh/hoist/mobile/cmp/message';
import {toastManager} from '@xh/hoist/mobile/cmp/toast';
import {menu} from '@xh/hoist/mobile/cmp/menu';
import {button} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';

import {
    feedbackDialog,
    aboutDialog,
    exceptionDialog,
    impersonationBar,
    loginPanel,
    updateBar,
    versionBar,
    lockoutPanel
} from './impl';

/**
 * Top-level wrapper for Mobile applications.
 *
 * This class provide core Hoist Application layout and infrastructure to an application's
 * root Component. Provides a standard viewport that includes standard UI elements such as an
 * impersonation bar header, version bar footer, an app-wide load mask, a base context menu,
 * popup message support, and exception rendering.
 *
 * @see HoistApp.containerClass
 */
@observer
export class AppContainer extends Component {

    @setter @observable.ref caughtException = null;

    constructor() {
        super();
        XH.initAsync();
    }

    render() {
        return div(
            this.renderContent(),
            exceptionDialog() // Always render the exception dialog -- might need it :-(
        );
    }

    renderContent() {
        const S = AppState;
        if (this.caughtException) return null;

        switch (XH.appState) {
            case S.PRE_AUTH:
            case S.INITIALIZING:
                return viewport(loadMask({isDisplayed: true}));
            case S.LOGIN_REQUIRED:
                return loginPanel();
            case S.ACCESS_DENIED:
                return lockoutPanel({
                    message: this.unauthorizedMessage()
                });
            case S.LOAD_FAILED:
                return null;
            case S.RUNNING:
            case S.SUSPENDED:
                return viewport(
                    vframe(
                        impersonationBar(),
                        updateBar(),
                        frame(Children.only(this.props.children)),
                        versionBar(),
                        this.renderAppMenu()
                    ),
                    loadMask({model: XH.appLoadModel}),
                    messageSource({model: XH.messageSourceModel}),
                    toastManager({model: XH.toastManagerModel}),
                    feedbackDialog({model: XH.feedbackDialogModel}),
                    aboutDialog()
                );
            default:
                return null;
        }
    }

    componentDidCatch(e, info) {
        this.setCaughtException(e);
        XH.handleException(e, {requireReload: true});
    }


    //------------------------
    // Implementation
    //------------------------
    renderAppMenu() {
        const model = XH.app.appMenuModel;
        if (!model) return null;
        return menu({
            model: model,
            width: 260,
            align: 'left'
        });
    }

    unauthorizedMessage() {
        const user = XH.getUser();

        return div(
            XH.accessDeniedMessage,
            vspacer(10),
            `
                You are logged in as ${user.username} 
                and have the roles [${user.roles.join(', ') || '--'}].
            `,
            vspacer(20),
            button({
                icon: Icon.logout(),
                text: 'Logout',
                omit: !XH.app.enableLogout,
                onClick: () => {
                    XH.identityService.logoutAsync();
                }
            })
        );
    }
}

export const appContainer = elemFactory(AppContainer);
