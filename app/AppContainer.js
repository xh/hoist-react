/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Children, Component} from 'react';
import {ContextMenuTarget} from 'hoist/kit/blueprint';
import {observer} from 'hoist/mobx';
import {elemFactory, hoistModel} from 'hoist/core';
import {contextMenu, loadMask} from 'hoist/cmp';
import {errorDialog} from 'hoist/error';
import {frame, vframe, viewport} from 'hoist/layout';
import {Icon} from 'hoist/icon';

import {aboutDialog, impersonationBar, lockoutPanel, loginPanel, versionBar} from './impl';

import './AppContainer.scss';


/**
 * Top-level wrapper to provide core Hoist Application layout and infrastructure to an application's
 * root Component. Provides initialized Hoist services and a standard viewport that also includes
 * standard UI elements such as an impersonation bar header, version bar footer, app-wide load mask,
 * context menu, and error dialog.
 *
 * Construction of this container triggers the init of the core `hoistModel` singleton, which
 * queries for an authorized user and then proceeds to init all core Hoist and app-level services.
 *
 * If the user is not yet known (and the app does *not* use SSO), this container will display a
 * standardized loginPanel component to prompt for a username and password. Once the user is
 * confirmed, this container will again mask until hoistModel has completed its initialization, at
 * which point the app's UI will be rendered.
 */
@observer
@ContextMenuTarget
export class AppContainer extends Component {

    constructor() {
        super();
        hoistModel.initAsync();
    }

    render() {
        const {authUsername, authCompleted, isInitialized, appModel, appLoadModel, errorDialogModel, showAbout} = hoistModel;

        if (!authCompleted) return this.renderPreloadMask();

        if (!authUsername) {
            return appModel.requireSSO ?
                lockoutPanel({message: 'Unable to contact UI server, or error processing single-sign on authentication'}) :
                loginPanel();
        }

        if (!isInitialized) return this.renderPreloadMask();

        return viewport(
            vframe(
                impersonationBar(),
                frame(Children.only(this.props.children)),
                versionBar()
            ),
            loadMask({model: appLoadModel, inline: false}),
            errorDialog({model: errorDialogModel}),
            aboutDialog({isOpen: showAbout})
        );
    }

    renderPreloadMask() {
        return loadMask({isDisplayed: true});
    }

    renderContextMenu() {
        return contextMenu({
            menuItems: [
                {
                    text: 'Reload App',
                    icon: Icon.refresh(),
                    action: () => hoistModel.reloadApp()
                },
                {
                    text: 'About',
                    icon: Icon.info(),
                    action: () => hoistModel.setShowAbout(true)
                },
                {
                    text: 'Logout',
                    icon: Icon.logout(),
                    omit: !hoistModel.appModel.enableLogout,
                    action: () => XH.identityService.logoutAsync()
                }
            ]
        });
    }
}
export const appContainer = elemFactory(AppContainer);
