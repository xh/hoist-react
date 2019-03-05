/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {observable, runInAction} from '@xh/hoist/mobx';
import {HoistComponent, elemFactory, elem, AppState, XH} from '@xh/hoist/core';
import {refreshContextView} from '@xh/hoist/core/refresh';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {div, frame, vframe, viewport} from '@xh/hoist/cmp/layout';

import {aboutDialog} from './AboutDialog';
import {feedbackDialog} from './FeedbackDialog';
import {optionsDialog} from './OptionsDialog';
import {exceptionDialog} from './ExceptionDialog';
import {impersonationBar} from './ImpersonationBar';
import {loginPanel} from './LoginPanel';
import {updateBar} from './UpdateBar';
import {versionBar}  from './VersionBar';
import {lockoutPanel} from './LockoutPanel';
import {messageSource} from './MessageSource';
import {IdleDialog} from './IdleDialog';
import {ToastSource} from './ToastSource';

import {AppContainerModel} from '@xh/hoist/core/appcontainer/AppContainerModel';

import {tabContainer} from '@xh/hoist/desktop/cmp/tab/impl/TabContainer';
import {StoreContextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {colChooser, ColChooserModel} from '@xh/hoist/desktop/cmp/grid';
import {installDesktopImpls} from '@xh/hoist/dynamics/desktop';

installDesktopImpls({
    tabContainer,
    colChooser,
    ColChooserModel,
    StoreContextMenu
});
/**
 * Top-level wrapper for Desktop applications.
 *
 * This class provide core Hoist Application layout and infrastructure to an application's
 * root Component. Provides a standard viewport that includes standard UI elements such as an
 * impersonation bar header, version bar footer, an app-wide load mask, a base context menu,
 * popup message support, and exception rendering.
 *
 * This component will kick off the Hoist application lifecycle when mounted.
 */
@HoistComponent
export class AppContainer extends Component {

    static modelClass = AppContainerModel;

    @observable.ref caughtException = null;

    constructor() {
        super();
        XH.initAsync();
    }

    componentDidMount() {
        this.toastSource = new ToastSource(this.model.toastSourceModel);
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
        const {model} = this;
        const S = AppState;
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
                            item: frame(elem(XH.appSpec.componentClass, {model: XH.appModel}))
                        }),
                        versionBar({model})
                    ),
                    mask({model: model.appLoadModel, spinner: true}),
                    messageSource({model: model.messageSourceModel}),
                    optionsDialog({model: model.optionsDialogModel}),
                    feedbackDialog({model: model.feedbackDialogModel}),
                    aboutDialog({model: model.aboutDialogModel}),
                    this.renderIdleDialog()
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
    renderIdleDialog() {
        const dialogClass = XH.appSpec.idleDialogClass || IdleDialog;

        return XH.appState == AppState.SUSPENDED && dialogClass ?
            elem(dialogClass, {onReactivate: () => XH.reloadApp()}) :
            null;
    }
}
export const appContainer = elemFactory(AppContainer);
