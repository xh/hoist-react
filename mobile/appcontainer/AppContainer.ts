/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';
import {errorBoundary} from '@xh/hoist/appcontainer/ErrorBoundary';
import {fragment, frame, vframe, viewport} from '@xh/hoist/cmp/layout';
import {createElement, hoistCmp, refreshContextView, uses, XH} from '@xh/hoist/core';
import {installMobileImpls} from '@xh/hoist/dynamics/mobile';
import {colChooser} from '@xh/hoist/mobile/cmp/grid/impl/ColChooser';
import {ColChooserModel} from '@xh/hoist/mobile/cmp/grid/impl/ColChooserModel';
import {mask} from '@xh/hoist/mobile/cmp/mask';
import {storeFilterFieldImpl} from '@xh/hoist/mobile/cmp/store/impl/StoreFilterField';
import {tabContainerImpl} from '@xh/hoist/mobile/cmp/tab/impl/TabContainer';
import {pinPadImpl} from '@xh/hoist/mobile/cmp/pinpad/impl/PinPad';
import {useOnMount, elementFromContent} from '@xh/hoist/utils/react';
import {isEmpty} from 'lodash';
import {aboutDialog} from './AboutDialog';
import {banner} from './Banner';
import {exceptionDialog} from './ExceptionDialog';
import {feedbackDialog} from './FeedbackDialog';
import {idlePanel} from './IdlePanel';
import {impersonationBar} from './ImpersonationBar';
import {lockoutPanel} from './LockoutPanel';
import {loginPanel} from './LoginPanel';
import {suspendPanel} from './SuspendPanel';
import {messageSource} from './MessageSource';
import {optionsDialog} from './OptionsDialog';
import {toastSource} from './ToastSource';
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

    render({model}) {
        useOnMount(() => model.initAsync());

        return fragment(
            errorBoundary(viewForState()),
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
    switch (XH.appState) {
        case 'PRE_AUTH':
        case 'INITIALIZING':
            return viewport(appLoadMask());
        case 'LOGIN_REQUIRED':
            return loginPanel();
        case 'ACCESS_DENIED':
            return lockoutView();
        case 'RUNNING':
            return appContainerView();
        case 'SUSPENDED':
            return suspendedView();
        case 'LOAD_FAILED':
        default:
            return null;
    }
}

const lockoutView = hoistCmp.factory<AppContainerModel>({
    displayName: 'LockoutView',
    render({model}) {
        const content = model.appSpec.lockoutPanel ?? lockoutPanel;
        return elementFromContent(content);
    }
});

const appContainerView = hoistCmp.factory<AppContainerModel>({
    displayName: 'AppContainerView',

    render({model}) {
        return viewport(
            vframe(
                impersonationBar(),
                bannerList(),
                refreshContextView({
                    model: model.refreshContextModel,
                    item: frame(
                        createElement(model.appSpec.componentClass, {model: model.appModel})
                    )
                }),
                versionBar()
            ),
            appLoadMask(),
            aboutDialog(),
            feedbackDialog(),
            optionsDialog()
        );
    }
});

const appLoadMask = hoistCmp.factory<AppContainerModel>(({model}) =>
    mask({bind: model.appLoadModel, spinner: true})
);

const bannerList = hoistCmp.factory<AppContainerModel>({
    render({model}) {
        const {bannerModels} = model.bannerSourceModel;
        if (isEmpty(bannerModels)) return null;
        return fragment({
            items: bannerModels.map(model => banner({model}))
        });
    }
});

const suspendedView = hoistCmp.factory<AppContainerModel>({
    render({model}) {
        if (model.appStateModel.suspendData?.reason === 'IDLE') {
            const content = model.appSpec.idlePanel ?? idlePanel;
            return elementFromContent(content, {onReactivate: () => XH.reloadApp()});
        }
        return suspendPanel();
    }
});
