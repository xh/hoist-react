/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component, Children} from 'react';
import {ContextMenuTarget} from 'hoist/kit/blueprint';
import {observer} from 'hoist/mobx';
import {elemFactory, hoistModel} from 'hoist/core';
import {loadMask, contextMenu} from 'hoist/cmp';
import {errorDialog} from 'hoist/error';
import {frame, viewport, vframe} from 'hoist/layout';
import {Icon} from 'hoist/icon';

import {aboutDialog, lockoutPanel, loginPanel, impersonationBar, versionBar} from './impl';

import './AppContainer.scss';

/**
 * Wrapper to provide core Hoist Application layout and infrastructure to an application's root Component.
 * Provides initialized Hoist services and a standard viewport that also includes an impersonationBar header,
 *  versionBar footer, app-wide loadMask and errorDialog.
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
                lockoutPanel({message: 'Error processing single-sign-on authentication'}) :
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