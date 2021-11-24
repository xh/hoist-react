/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';
import {fragment, frame, vframe, viewport} from '@xh/hoist/cmp/layout';
import {AppState, elem, hoistCmp, refreshContextView, uses, XH} from '@xh/hoist/core';
import {errorBoundary} from '@xh/hoist/core/impl/ErrorBoundary';
import {changelogDialog} from '@xh/hoist/desktop/appcontainer/ChangelogDialog';
import {StoreContextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {dockContainerImpl} from '@xh/hoist/desktop/cmp/dock/impl/DockContainer';
import {colChooserDialog as colChooser} from '@xh/hoist/desktop/cmp/grid/impl/colchooser/ColChooserDialog';
import {ColChooserModel} from '@xh/hoist/desktop/cmp/grid/impl/colchooser/ColChooserModel';
import {columnHeaderFilter} from '@xh/hoist/desktop/cmp/grid/impl/filter/ColumnHeaderFilter';
import {ColumnHeaderFilterModel} from '@xh/hoist/desktop/cmp/grid/impl/filter/ColumnHeaderFilterModel';
import {gridFilterDialog} from '@xh/hoist/desktop/cmp/grid/impl/filter/GridFilterDialog';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {pinPadImpl} from '@xh/hoist/desktop/cmp/pinpad/impl/PinPad';
import {storeFilterFieldImpl} from '@xh/hoist/desktop/cmp/store/impl/StoreFilterField';
import {tabContainerImpl} from '@xh/hoist/desktop/cmp/tab/impl/TabContainer';
import {useContextMenu, useHotkeys} from '@xh/hoist/desktop/hooks';
import {installDesktopImpls} from '@xh/hoist/dynamics/desktop';
import {hotkeysProvider} from '@xh/hoist/kit/blueprint';
import {elementFromContent, useOnMount} from '@xh/hoist/utils/react';
import {isEmpty} from 'lodash';
import {aboutDialog} from './AboutDialog';
import {banner} from './Banner';
import {exceptionDialog} from './ExceptionDialog';
import {feedbackDialog} from './FeedbackDialog';
import {idlePanel} from './IdlePanel';
import {impersonationBar} from './ImpersonationBar';
import {lockoutPanel} from './LockoutPanel';
import {loginPanel} from './LoginPanel';
import {messageSource} from './MessageSource';
import {optionsDialog} from './OptionsDialog';
import {toastSource} from './ToastSource';
import {versionBar} from './VersionBar';

installDesktopImpls({
    tabContainerImpl,
    dockContainerImpl,
    storeFilterFieldImpl,
    pinPadImpl,
    colChooser,
    columnHeaderFilter,
    gridFilterDialog,
    ColChooserModel,
    ColumnHeaderFilterModel,
    StoreContextMenu
});
/**
 * Top-level wrapper for Desktop applications.
 *
 * This class provide core Hoist Application layout and infrastructure to an application's
 * root Component. Provides a standard viewport that includes standard UI elements such as an
 * impersonation bar header, version bar footer, an app-wide load mask, a base context menu,
 * popup+banner message support, and exception rendering.
 *
 * This component will kick off the Hoist application lifecycle when mounted.
 */
export const AppContainer = hoistCmp({
    displayName: 'AppContainer',
    model: uses(AppContainerModel),

    render() {
        useOnMount(() => XH.initAsync());

        return fragment(
            hotkeysProvider(
                errorBoundary({
                    item: viewForState(),
                    onError: (e) => XH.handleException(e, {requireReload: true})
                }),
                // Modal component helpers rendered here at top-level to support display of messages
                // and exceptions at any point during the app lifecycle.
                exceptionDialog(),
                messageSource(),
                toastSource()
            )
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
        const {appSpec, appModel} = XH;
        let ret = viewport(
            vframe(
                impersonationBar(),
                bannerList(),
                refreshContextView({
                    model: model.refreshContextModel,
                    item: frame(elem(appSpec.componentClass, {model: appModel}))
                }),
                versionBar()
            ),
            mask({bind: model.appLoadModel, spinner: true}),
            aboutDialog(),
            changelogDialog(),
            feedbackDialog(),
            optionsDialog()
        );

        if (!appSpec.showBrowserContextMenu) {
            ret = useContextMenu(ret, null);
        }

        ret = useHotkeys(ret, globalHotKeys(model));

        return ret;
    }
});

const bannerList = hoistCmp.factory({
    render({model}) {
        const {bannerModels} = model.bannerSourceModel;
        if (isEmpty(bannerModels)) return null;
        return fragment({
            items: bannerModels.map(model => banner({model, key: model.xhId}))
        });
    }
});

function globalHotKeys(model) {
    const {impersonationBarModel, optionsDialogModel} = model,
        ret = [
            {
                global: true,
                combo: 'shift + r',
                label: 'Refresh application data',
                onKeyDown: () => XH.refreshAppAsync()
            }
        ];

    if (XH.identityService.canAuthUserImpersonate) {
        ret.push({
            global: true,
            combo: 'shift + i',
            label: 'Impersonate another user',
            onKeyDown: () => impersonationBarModel.toggleVisibility()
        });
    }
    if (optionsDialogModel.hasOptions) {
        ret.push({
            global: true,
            combo: 'shift + o',
            label: 'Open application options',
            onKeyDown: () => optionsDialogModel.toggleVisibility()
        });
    }
    return ret;
}

const idlePanelHost = hoistCmp.factory({
    displayName: 'IdlePanel',
    render() {
        const content = XH.appSpec.idlePanel ?? idlePanel;
        return elementFromContent(content, {onReactivate: () => XH.reloadApp()});
    }
});

