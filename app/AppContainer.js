/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Children, Component} from 'react';
import {ContextMenuTarget} from 'hoist/kit/blueprint';
import {observable, observer, setter} from 'hoist/mobx';
import {elemFactory, LoadState, XH} from 'hoist/core';
import {contextMenu, loadMask} from 'hoist/cmp';
import {div, frame, vframe, viewport} from 'hoist/layout';
import {Icon} from 'hoist/icon';

import {
    aboutDialog,
    exceptionDialog,
    impersonationBar,
    loginPanel,
    updateBar,
    versionBar
} from './impl';


/**
 * Top-level wrapper to provide core Hoist Application layout and infrastructure to an application's
 * root Component. Provides initialized Hoist services and a standard viewport that also includes
 * standard UI elements such as an impersonation bar header, version bar footer, app-wide load mask,
 * context menu, and error dialog.
 *
 * Construction of this container triggers the init of the core XH singleton, which
 * queries for an authorized user and then proceeds to init all core Hoist and app-level services.
 *
 * If the user is not yet known (and the app does *not* use SSO), this container will display a
 * standardized loginPanel component to prompt for a username and password. Once the user is
 * confirmed, this container will again mask until Hoist has completed its initialization, at
 * which point the app's UI will be rendered.
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
        if (this.caughtException) return null;

        switch (XH.loadState) {
            case LoadState.PRE_AUTH:
            case LoadState.INITIALIZING:
                return loadMask({isDisplayed: true});
            case LoadState.LOGIN_REQUIRED:
                return loginPanel();
            case LoadState.FAILED:
                return null;
            case LoadState.COMPLETE:
                return viewport(
                    vframe(
                        impersonationBar(),
                        updateBar(),
                        frame(Children.only(this.props.children)),
                        versionBar()
                    ),
                    loadMask({model: XH.appLoadModel, inline: false}),
                    aboutDialog()
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
                    hidden: !XH.appModel.enableLogout,
                    action: () => XH.identityService.logoutAsync()
                }
            ]
        });
    }

    componentDidCatch(e, info) {
        this.setCaughtException(e);
        XH.handleException(e, {requireReload: true});
    }
}
export const appContainer = elemFactory(AppContainer);
