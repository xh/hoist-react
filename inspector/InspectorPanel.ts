/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {filler, fragment, span} from '@xh/hoist/cmp/layout';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {messageSource} from '@xh/hoist/desktop/appcontainer/MessageSource';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {tabSwitcher} from '@xh/hoist/desktop/cmp/tab';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {InspectorModel} from '@xh/hoist/inspector/InspectorModel';
import {portalProvider} from '@xh/hoist/kit/blueprint';
import {createPortal} from 'react-dom';
import './Inspector.scss';

/**
 * See {@link InspectorService} for an explanation of the Hoist Inspector tool.
 *
 * The Inspector renders in a separate browser window, leaving the app's viewport entirely to the
 * app. Window hosting is managed by {@link InspectorModel}.
 */
export const inspectorPanel = hoistCmp.factory({
    displayName: 'InspectorPanel',
    model: creates(InspectorModel),

    render({model}) {
        const {windowContainer, tabContainerModel, messageSourceModel} = model;
        if (!XH.inspectorService.active || !windowContainer) return null;

        const ret = panel({
            className: 'xh-inspector',
            flex: 1,
            modelConfig: {collapsible: false, resizable: false, errorBoundary: true, xhImpl: true},
            tbar: toolbar({
                compact: true,
                className: 'xh-inspector__bar',
                items: [
                    span({
                        className: 'xh-inspector__title',
                        item: `${XH.appName} - Tab ${XH.tabId}`
                    }),
                    '-',
                    tabSwitcher({model: tabContainerModel}),
                    filler(),
                    button({
                        icon: Icon.openExternal(),
                        tooltip: 'Focus the app tab this Inspector is attached to',
                        onClick: () => model.focusApp()
                    }),
                    button({
                        icon: Icon.reset(),
                        tooltip: "Restore Inspector's layout and options to their defaults",
                        onClick: () => model.restoreDefaultsAsync()
                    })
                ]
            }),
            item: tabContainer({model: tabContainerModel, switcher: false})
        });

        // Redirect Blueprint portals (tooltips, popovers, dialogs) into the Inspector window.
        return createPortal(
            portalProvider({
                portalContainer: windowContainer,
                item: fragment(ret, messageSource({model: messageSourceModel}))
            }),
            windowContainer
        );
    }
});
