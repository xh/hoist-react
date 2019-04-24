/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {observable, runInAction} from '@xh/hoist/mobx';
import {HoistComponent, elem, elemFactory, AppState, XH} from '@xh/hoist/core';
import {refreshContextView} from '@xh/hoist/core/refresh';
import {div, vframe, viewport} from '@xh/hoist/cmp/layout';
import {mask} from '@xh/hoist/mobile/cmp/mask';
import {menu} from '@xh/hoist/mobile/cmp/menu';

import {aboutDialog} from './AboutDialog';
import {feedbackDialog} from './FeedbackDialog';
import {optionsDialog} from './OptionsDialog';
import {exceptionDialog} from './ExceptionDialog';
import {impersonationBar} from './ImpersonationBar';
import {loginPanel} from './LoginPanel';
import {updateBar} from './UpdateBar';
import {versionBar}  from './VersionBar';
import {lockoutPanel} from './LockoutPanel';
import {toastSource} from './ToastSource';
import {messageSource} from './MessageSource';

import {AppContainerModel} from '@xh/hoist/core/appcontainer/AppContainerModel';

import {tabContainer} from '@xh/hoist/mobile/cmp/tab/impl/TabContainer';
import {colChooser, ColChooserModel} from '@xh/hoist/mobile/cmp/grid';
import {installMobileImpls} from '@xh/hoist/dynamics/mobile';

installMobileImpls({
    tabContainer,
    colChooser,
    ColChooserModel
});

/**
 * Top-level wrapper for Mobile applications.
 *
 * This class provide core Hoist Application layout and infrastructure to an application's
 * root Component. Provides a standard viewport that includes standard UI elements such as an
 * impersonation bar header, version bar footer, an app-wide load mask, a base context menu,
 * popup message support, and exception rendering.
 *
 * @see AppSpec.containerClass
 */
@HoistComponent
export class AppContainer extends Component {

    static modelClass = AppContainerModel;

    @observable.ref caughtException = null;

    constructor() {
        super();
        XH.initAsync();
    }

    render() {
        return div(
            this.renderContent(),
            // Always be prepared to render exceptions :-(
            exceptionDialog({
                model: this.model.exceptionDialogModel
            })
        );
    }

    renderContent() {
        const S = AppState,
            {model} = this;
        if (this.caughtException) return null;

        switch (XH.appState) {
            case S.PRE_AUTH:
            case S.INITIALIZING:
                return viewport(mask({isDisplayed: true, spinner: true}));
            case S.LOGIN_REQUIRED:
                return loginPanel({model: model.loginPanelModel});
            case S.ACCESS_DENIED:
                return lockoutPanel({model});
            case S.LOAD_FAILED:
                return null;
            case S.RUNNING:
            case S.SUSPENDED:
                return viewport(
                    vframe(
                        impersonationBar({model: model.impersonationBarModel}),
                        updateBar({model}),
                        refreshContextView({
                            model: model.refreshContextModel,
                            item: vframe(elem(XH.appSpec.componentClass, {model: XH.appModel}))
                        }),
                        versionBar({model}),
                        this.renderAppMenu()
                    ),
                    mask({model: model.appLoadModel, spinner: true}),
                    messageSource({model: model.messageSourceModel}),
                    toastSource({model: model.toastSourceModel}),
                    feedbackDialog({model: model.feedbackDialogModel}),
                    optionsDialog({model: model.optionsDialogModel}),
                    aboutDialog({model: model.aboutDialogModel})
                );
            default:
                return null;
        }
    }

    componentDidCatch(e, info) {
        runInAction(() => this.caughtException = e);
        XH.handleException(e, {requireReload: true});
    }
    
    //------------------------
    // Implementation
    //------------------------
    renderAppMenu() {
        const model = XH.appModel.appMenuModel;
        if (!model) return null;
        return menu({
            model: model,
            width: 260,
            align: 'left'
        });
    }
}
export const appContainer = elemFactory(AppContainer);
