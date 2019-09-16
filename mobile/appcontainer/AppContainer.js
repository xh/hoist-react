/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {elem, AppState, XH, uses, hoistCmp} from '@xh/hoist/core';
import {refreshContextView} from '@xh/hoist/core/refresh';
import {fragment, frame, vframe, viewport} from '@xh/hoist/cmp/layout';
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

import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';

import {tabContainerImpl} from '@xh/hoist/mobile/cmp/tab/impl/TabContainer';
import {colChooser, ColChooserModel} from '@xh/hoist/mobile/cmp/grid';
import {installMobileImpls} from '@xh/hoist/dynamics/mobile';
import {errorBoundary} from '@xh/hoist/core/impl';
import {useOnMount} from '@xh/hoist/utils/react';

installMobileImpls({
    tabContainerImpl,
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
export const AppContainer = hoistCmp({
    displayName: 'AppContainer',
    model: uses(AppContainerModel),

    render() {

        useOnMount(() => XH.initAsync());

        return fragment(
            errorBoundary({
                item: appContainerView(),
                onError: (e) => XH.handleException(e, {requireReload: true})
            }),
            exceptionDialog()
        );
    }
});


//-------------------
// Implementation
//-------------------
const appContainerView = hoistCmp.factory({
    displayName: 'AppContainerView',
    model: uses(AppContainerModel),

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
                        versionBar(),
                        appMenu()
                    ),
                    mask({model: model.appLoadModel, spinner: true}),
                    messageSource(),
                    toastSource(),
                    feedbackDialog(),
                    optionsDialog(),
                    aboutDialog()
                );
            default:
                return null;
        }
    }
});


const appMenu = hoistCmp.factory({
    displayName: 'AppMenu',

    render() {
        const menuModel = XH.appModel.appMenuModel;
        if (!menuModel) return null;
        return menu({
            model: menuModel,
            width: 260,
            align: 'right'
        });
    }
});
