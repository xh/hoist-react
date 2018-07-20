/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Children, Component} from 'react';
import {observable, observer, setter} from '@xh/hoist/mobx';
import {HoistComponent, elemFactory, elem, AppState, XH} from '@xh/hoist/core';
import {loadMask} from '@xh/hoist/desktop/cmp/mask';
import {div, frame, vframe, viewport} from '@xh/hoist/cmp/layout';

import {aboutDialog} from './AboutDialog';
import {feedbackDialog} from './FeedbackDialog';
import {exceptionDialog} from './ExceptionDialog';
import {impersonationBar} from './ImpersonationBar';
import {loginPanel} from './LoginPanel';
import {updateBar} from './UpdateBar';
import {versionBar}  from './VersionBar';
import {lockoutPanel} from './LockoutPanel';
import {messageSource} from './MessageSource';
import {SuspendedDialog} from './SuspendedDialog';
import {ToastSource} from './ToastSource';


/**
 * Top-level wrapper for Desktop applications.
 *
 * This class provide core Hoist Application layout and infrastructure to an application's
 * root Component. Provides a standard viewport that includes standard UI elements such as an
 * impersonation bar header, version bar footer, an app-wide load mask, a base context menu,
 * popup message support, and exception rendering.
 */
@HoistComponent()
export class AppContainer extends Component {

    @setter @observable.ref caughtException = null

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
                return viewport(loadMask({isDisplayed: true}));
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
                        frame(Children.only(this.props.children)),
                        versionBar({model})
                    ),
                    loadMask({model: model.appLoadModel}),
                    messageSource({model: model.messageSourceModel}),
                    feedbackDialog({model: model.feedbackDialogModel}),
                    aboutDialog({model: model.aboutDialogModel}),
                    this.renderSuspendedDialog()
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
    renderSuspendedDialog() {
        const dialogClass = XH.app.suspendedDialogClass || SuspendedDialog;

        return XH.appState == AppState.SUSPENDED && dialogClass ?
            elem(dialogClass, {onReactivate: () => XH.reloadApp()}) :
            null;
    }
}
export const appContainer = elemFactory(AppContainer);
