/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory, elem, AppState, XH, hoistCmpFactory, providedAndPublished} from '@xh/hoist/core';
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
import {toastSource} from './ToastSource';

import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';

import {tabContainer} from '@xh/hoist/desktop/cmp/tab/impl/TabContainer';
import {dockContainer} from '@xh/hoist/desktop/cmp/dock/impl/DockContainer';
import {StoreContextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {colChooserDialog as colChooser, ColChooserModel} from '@xh/hoist/desktop/cmp/grid';
import {installDesktopImpls} from '@xh/hoist/dynamics/desktop';

installDesktopImpls({
    tabContainer,
    dockContainer,
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
 * It also handles the high-level error boundary (and therefore must remain a class component)
 */
@HoistComponent
export class AppContainer extends Component {

    static modelClass = AppContainerModel;

    constructor() {
        super();
        XH.initAsync();
    }

    render() {
        const {model} = this;
        return div(
            contentView({model}),
            exceptionDialog({model: model.exceptionDialogModel})
        );
    }

    componentDidCatch(e, info) {
        this.model.setCaughtException(e);
        XH.handleException(e, {requireReload: true});
    }
}
export const appContainer = elemFactory(AppContainer);


//-----------------------------------------
// Implementation
//-----------------------------------------
const contentView = hoistCmpFactory({
    model: providedAndPublished(AppContainerModel),

    render({model}) {
        if (model.caughtException) return null;

        const S = AppState;
        switch (XH.appState) {
            case S.PRE_AUTH:
            case S.INITIALIZING:
                return viewport(mask({isDisplayed: true, spinner: true}));
            case S.LOGIN_REQUIRED:
                return loginPanel();
            case S.ACCESS_DENIED:
                return lockoutPanel();
            case S.LOAD_FAILED:
                return null;
            case S.RUNNING:
            case S.SUSPENDED:
                return viewport(
                    vframe(
                        impersonationBar(),
                        updateBar(),
                        refreshContextView({
                            model: model.refreshContextModel,
                            item: frame(elem(XH.appSpec.componentClass, {model: XH.appModel}))
                        }),
                        versionBar()
                    ),
                    mask({model: model.appLoadModel, spinner: true}),
                    messageSource(),
                    toastSource(),
                    optionsDialog(),
                    feedbackDialog(),
                    aboutDialog(),
                    idleDialog()
                );
            default:
                return null;
        }
    }
});

const idleDialog = hoistCmpFactory(
    () => {
        const dialogClass = XH.appSpec.idleDialogClass || IdleDialog;

        return XH.appState == AppState.SUSPENDED && dialogClass ?
            elem(dialogClass, {onReactivate: () => XH.reloadApp()}) :
            null;
    }
);
