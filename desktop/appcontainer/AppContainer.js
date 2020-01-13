/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {hoistCmp, elem, AppState, XH, uses} from '@xh/hoist/core';
import {refreshContextView} from '@xh/hoist/core/refresh';
import {errorBoundary} from '@xh/hoist/core/impl';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {fragment, frame, vframe, viewport} from '@xh/hoist/cmp/layout';

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

import {tabContainerImpl} from '@xh/hoist/desktop/cmp/tab/impl/TabContainer';
import {dockContainerImpl} from '@xh/hoist/desktop/cmp/dock/impl/DockContainer';
import {storeFilterFieldImpl} from '@xh/hoist/desktop/cmp/store/impl/StoreFilterField';
import {StoreContextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {colChooserDialog as colChooser, ColChooserModel} from '@xh/hoist/desktop/cmp/grid';
import {installDesktopImpls} from '@xh/hoist/dynamics/desktop';
import {useOnMount} from '@xh/hoist/utils/react';
import {useHotkeys} from '@xh/hoist/desktop/hooks';

installDesktopImpls({
    tabContainerImpl,
    dockContainerImpl,
    storeFilterFieldImpl,
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
            exceptionDialog()
        );
    }
});

//-----------------------------------------
// Implementation
//-----------------------------------------
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
        case S.SUSPENDED:
            return appContainerView();
        case S.LOAD_FAILED:
        default:
            return null;
    }
}

const appContainerView = hoistCmp.factory({
    displayName: 'AppContainerView',

    render({model}) {
        return useHotkeys(
            viewport(
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
            ),
            globalHotKeys(model)
        );
    }
});

function globalHotKeys(model) {
    const {impersonationBarModel, optionsDialogModel} = model,
        ret = [];

    if (XH.identityService.canImpersonate) {
        ret.push({
            global: true,
            combo: 'shift + i',
            label: 'Open Impersonation Dialog',
            onKeyDown: () => impersonationBarModel.toggleVisibility()
        });
    }
    if (optionsDialogModel.hasOptions) {
        ret.push({
            global: true,
            combo: 'shift + o',
            label: 'Open Options Dialog',
            onKeyDown: () => optionsDialogModel.toggleVisibility()
        });
    }
    return ret;
}

const idleDialog = hoistCmp.factory({
    displayName: 'IdleDialog',
    render() {
        const dialogClass = XH.appSpec.idleDialogClass || IdleDialog;

        return XH.appState == AppState.SUSPENDED && dialogClass ?
            elem(dialogClass, {onReactivate: () => XH.reloadApp()}) :
            null;
    }
});
