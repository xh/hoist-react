/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Children, Component} from 'react';
import {ContextMenuTarget} from '@xh/hoist/kit/blueprint';
import {observable, observer, setter} from '@xh/hoist/mobx';
import {elemFactory, elem, AppState, XH} from '@xh/hoist/core';
import {contextMenu} from '@xh/hoist/cmp/contextmenu';
import {loadMask} from '@xh/hoist/cmp/mask';
import {messageSource} from '@xh/hoist/cmp/message';
import {div, frame, vframe, viewport, vspacer} from '@xh/hoist/cmp/layout';
import {logoutButton} from '@xh/hoist/cmp/button';
import {Icon} from '@xh/hoist/icon';

import {
    feedbackDialog,
    aboutDialog,
    exceptionDialog,
    impersonationBar,
    loginPanel,
    updateBar,
    versionBar,
    lockoutPanel,
    SuspendedDialog
} from './';

/**
 * Top-level wrapper to provide core Hoist Application layout and infrastructure to an application's
 * root Component. Provides a standard viewport that includes standard UI elements such as an
 * impersonation bar header, version bar footer, an app-wide load mask, a base context menu,
 * popup message support, and exception rendering.
 *
 * Successful construction of this container indicates that all app code has been loaded, and is
 * being mounted. This triggers a call to XH.initAsync() to begin the Hoist and Application loading
 * lifecycle.
 *
 * If the application is in the 'LOGIN_REQUIRED' state, this container will display a
 * standardized loginPanel component to prompt for a username and password. During loading and initialization
 * this componenent will render standard masks.  Once the application has reached "RUNNING" state it will be fully
 * rendered.
 *
 * @private
 */
@observer
@ContextMenuTarget
export class AppContainer extends Component {

    @setter @observable.ref caughtException = null

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
                        versionBar()
                    ),
                    loadMask({model: XH.appLoadModel}),
                    messageSource({model: XH.messageSourceModel}),
                    feedbackDialog({model: XH.feedbackDialogModel}),
                    aboutDialog(),
                    this.renderSuspendedDialog()
                );
            default:
                return null;
        }
    }

    renderContextMenu() {
        return contextMenu({
            menuItems: [
                {
                    text: 'Reload App',
                    icon: Icon.refresh(),
                    action: () => XH.reloadApp()
                },
                {
                    text: 'About',
                    icon: Icon.info(),
                    action: () => XH.showAbout()
                },
                {
                    text: 'Logout',
                    icon: Icon.logout(),
                    hidden: !XH.app.enableLogout,
                    action: () => XH.identityService.logoutAsync()
                }
            ]
        });
    }

    componentDidCatch(e, info) {
        this.setCaughtException(e);
        XH.handleException(e, {requireReload: true});
    }


    //------------------------
    // Implementation
    //------------------------
    renderSuspendedDialog() {
        const dialogClass = XH.app.suspendedDialogClass || SuspendedDialog;

        return XH.appState == AppState.SUSPENDED && dialogClass ?
            elem(dialogClass, {onReactivate: () => XH.reloadApp()}) :
            null;
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
            logoutButton({
                text: 'Logout',
                omit: !XH.app.enableLogout
            })
        );
    }
}

export const appContainer = elemFactory(AppContainer);
