/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';
import {fragment, frame, vframe, viewport} from '@xh/hoist/cmp/layout';
import {AppState, elem, hoistCmp, refreshContextView, uses, XH} from '@xh/hoist/core';
import {errorBoundary} from '@xh/hoist/core/impl/ErrorBoundary';
import {installMobileImpls} from '@xh/hoist/dynamics/mobile';
import {colChooser} from '@xh/hoist/mobile/cmp/grid/impl/ColChooser';
import {ColChooserModel} from '@xh/hoist/mobile/cmp/grid/impl/ColChooserModel';
import {mask} from '@xh/hoist/mobile/cmp/mask';
import {storeFilterFieldImpl} from '@xh/hoist/mobile/cmp/store/impl/StoreFilterField';
import {tabContainerImpl} from '@xh/hoist/mobile/cmp/tab/impl/TabContainer';
import {pinPadImpl} from '@xh/hoist/mobile/cmp/pinpad/impl/PinPad';
import {useOnMount, elementFromContent} from '@xh/hoist/utils/react';
import {aboutDialog} from './AboutDialog';
import {exceptionDialog} from './ExceptionDialog';
import {feedbackDialog} from './FeedbackDialog';
import {idlePanel} from './IdlePanel';
import {impersonationBar} from './ImpersonationBar';
import {lockoutPanel} from './LockoutPanel';
import {loginPanel} from './LoginPanel';
import {messageSource} from './MessageSource';
import {optionsDialog} from './OptionsDialog';
import {toastSource} from './ToastSource';
import {updateBar} from './UpdateBar';
import {versionBar} from './VersionBar';

installMobileImpls({
    tabContainerImpl,
    storeFilterFieldImpl,
    pinPadImpl,
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
                item: viewForState(),
                onError: (e) => XH.handleException(e, {requireReload: true})
            }),
            // Modal component helpers rendered here at top-level to support display of messages
            // and exceptions at any point during the app lifecycle.
            exceptionDialog(),
            messageSource(),
            toastSource()
        );
    }
});


//-------------------
// Implementation
//-------------------
function viewForState() {
    const S = AppState;
    switch (XH.appState) {
        case S.PRE_AUTH:
        case S.INITIALIZING:
            return viewport(mask({isDisplayed: true, spinner: true}));
        case S.LOGIN_REQUIRED:
            return loginPanel();
        case S.ACCESS_DENIED:
            return lockoutPanel();
        case S.RUNNING:
            return appContainerView();
        case S.SUSPENDED:
            return idlePanelHost();
        case S.LOAD_FAILED:
        default:
            return null;
    }
}

const appContainerView = hoistCmp.factory({
    displayName: 'AppContainerView',

    render({model}) {
        if (model.caughtException) return null;
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
            aboutDialog(),
            feedbackDialog(),
            optionsDialog()
        );
    }
});

const idlePanelHost = hoistCmp.factory({
    displayName: 'IdlePanel',
    render() {
        const content = XH.appSpec.idlePanel ?? idlePanel;
        return elementFromContent(content, {onReactivate: () => XH.reloadApp()});
    }
});
