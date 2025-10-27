/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HotkeyConfig} from '@blueprintjs/core/src/hooks/hotkeys/hotkeyConfig';
import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';
import {errorBoundary} from '@xh/hoist/cmp/error/ErrorBoundary';
import {fragment, frame, vframe, viewport} from '@xh/hoist/cmp/layout';
import {mask} from '@xh/hoist/cmp/mask';
import {createElement, hoistCmp, refreshContextView, uses, XH} from '@xh/hoist/core';
import {changelogDialog} from '@xh/hoist/desktop/appcontainer/ChangelogDialog';
import {dockContainerImpl} from '@xh/hoist/desktop/cmp/dock/impl/DockContainer';
import {errorMessageImpl} from '@xh/hoist/desktop/cmp/error/impl/ErrorMessage';
import {colChooserDialog as colChooser} from '@xh/hoist/desktop/cmp/grid/impl/colchooser/ColChooserDialog';
import {ColChooserModel} from '@xh/hoist/desktop/cmp/grid/impl/colchooser/ColChooserModel';
import {columnHeaderFilter} from '@xh/hoist/desktop/cmp/grid/impl/filter/ColumnHeaderFilter';
import {ColumnHeaderFilterModel} from '@xh/hoist/desktop/cmp/grid/impl/filter/ColumnHeaderFilterModel';
import {gridFilterDialog} from '@xh/hoist/desktop/cmp/grid/impl/filter/GridFilterDialog';
import {maskImpl} from '@xh/hoist/desktop/cmp/mask/impl/Mask';
import {ModalSupportModel} from '@xh/hoist/desktop/cmp/modalsupport';
import {pinPadImpl} from '@xh/hoist/desktop/cmp/pinpad/impl/PinPad';
import {storeFilterFieldImpl} from '@xh/hoist/desktop/cmp/store/impl/StoreFilterField';
import {tabContainerImpl} from '@xh/hoist/desktop/cmp/tab/impl/TabContainer';
import {zoneMapperDialog as zoneMapper} from '@xh/hoist/desktop/cmp/zoneGrid/impl/ZoneMapperDialog';
import {useContextMenu, useHotkeys} from '@xh/hoist/desktop/hooks';
import {installDesktopImpls} from '@xh/hoist/dynamics/desktop';
import {inspectorPanel} from '@xh/hoist/inspector/InspectorPanel';
import {blueprintProvider} from '@xh/hoist/kit/blueprint';
import {consumeEvent} from '@xh/hoist/utils/js';
import {elementFromContent, useOnMount} from '@xh/hoist/utils/react';
import {isEmpty} from 'lodash';
import {ReactElement} from 'react';
import {aboutDialog} from './AboutDialog';
import {banner} from './Banner';
import {exceptionDialog} from './ExceptionDialog';
import {feedbackDialog} from './FeedbackDialog';
import {impersonationBar} from './ImpersonationBar';
import {lockoutPanel} from './LockoutPanel';
import {loginPanel} from './LoginPanel';
import {messageSource} from './MessageSource';
import {optionsDialog} from './OptionsDialog';
import {suspendPanel} from './suspend/SuspendPanel';
import {toastSource} from './ToastSource';
import {versionBar} from './VersionBar';

installDesktopImpls({
    tabContainerImpl,
    dockContainerImpl,
    storeFilterFieldImpl,
    pinPadImpl,
    colChooser,
    zoneMapper,
    columnHeaderFilter,
    gridFilterDialog,
    ColChooserModel,
    ColumnHeaderFilterModel,
    useContextMenu,
    ModalSupportModel,
    errorMessageImpl,
    maskImpl
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

    render({model}) {
        useOnMount(() => model.initAsync());

        return blueprintProvider(
            errorBoundary({
                modelConfig: {
                    errorHandler: {
                        title: 'Critical Error',
                        message:
                            XH.clientAppName +
                            ' encountered a critical error and cannot be displayed.',
                        requireReload: true
                    },
                    errorRenderer: () => null
                },
                item: viewForState({model})
            }),
            // Modal component helpers rendered here at top-level to support display of messages
            // and exceptions at any point during the app lifecycle.
            exceptionDialog(),
            messageSource(),
            toastSource()
        );
    }
});

//-----------------------------------------
// Implementation
//-----------------------------------------
function viewForState({model}) {
    switch (XH.appState) {
        case 'PRE_AUTH':
        case 'AUTHENTICATING':
        case 'INITIALIZING_HOIST':
        case 'INITIALIZING_APP':
            return viewport(
                mask({spinner: true, isDisplayed: true, message: model.initializingLoadMaskMessage})
            );
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

const appContainerView = hoistCmp.factory({
    displayName: 'AppContainerView',
    model: uses(AppContainerModel),

    render({model}) {
        const {appSpec, appModel} = model;
        let ret: ReactElement = viewport(
            vframe(
                impersonationBar(),
                bannerList(),
                refreshContextView({
                    model: model.refreshContextModel,
                    item: frame(createElement(appSpec.componentClass, {model: appModel}))
                }),
                inspectorPanel(),
                versionBar()
            ),
            appLoadMask(),
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

const appLoadMask = hoistCmp.factory<AppContainerModel>(({model}) =>
    mask({bind: model.appLoadModel, spinner: true})
);

const suspendedView = hoistCmp.factory(() => viewport(suspendPanel(), appLoadMask()));

const bannerList = hoistCmp.factory<AppContainerModel>({
    render({model}) {
        const {bannerModels} = model.bannerSourceModel;
        if (isEmpty(bannerModels)) return null;
        return fragment({
            items: bannerModels.map(model => banner({model}))
        });
    }
});

function globalHotKeys(model: AppContainerModel) {
    const {impersonationBarModel, optionsDialogModel} = model,
        ret: HotkeyConfig[] = [
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
            onKeyDown: e => {
                consumeEvent(e); // avoid typing "i" in the impersonation bar select
                impersonationBarModel.toggleVisibility();
            }
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
