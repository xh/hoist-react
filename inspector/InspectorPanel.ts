/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {InspectorModel} from '@xh/hoist/inspector/InspectorModel';
import {instancesPanel} from '@xh/hoist/inspector/instances/InstancesPanel';
import {statsPanel} from '@xh/hoist/inspector/stats/StatsPanel';
import {portalProvider} from '@xh/hoist/kit/blueprint';
import {createPortal} from 'react-dom';
import './Inspector.scss';

/**
 * See {@link InspectorService} for an explanation of the Hoist Inspector tool.
 *
 * In addition to its default rendering as a panel docked within the app viewport, the Inspector
 * can be popped out into a separate browser window ('window' mode), leaving the app's viewport
 * entirely to the app. Hosting is managed by {@link InspectorModel}.
 */
export const inspectorPanel = hoistCmp.factory({
    displayName: 'InspectorPanel',
    model: creates(InspectorModel),

    render({model}) {
        if (!XH.inspectorService.active) return null;

        const {windowContainer} = model;

        // Key by mode to remount the view (and recreate its mode-specific PanelModel) on change.
        return windowContainer
            ? createPortal(inspectorView({key: 'window'}), windowContainer)
            : inspectorView({key: 'dock'});
    }
});

const inspectorView = hoistCmp.factory<InspectorModel>({
    displayName: 'InspectorView',

    render({model}) {
        const {popupContainer, isWindowed} = model;

        const ret = panel({
            title: `Inspector - Hoist v${XH.environmentService.get('hoistReactVersion')}`,
            icon: Icon.search(),
            className: 'xh-inspector',
            headerClassName: 'xh-inspector-panel-header',
            flex: isWindowed ? 1 : undefined,
            modelConfig: isWindowed
                ? {collapsible: false, resizable: false, errorBoundary: true, xhImpl: true}
                : {
                      defaultSize: 400,
                      side: 'bottom',
                      persistWith: XH.inspectorService.persistWith,
                      errorBoundary: true,
                      showHeaderCollapseButton: false,
                      xhImpl: true
                  },
            compactHeader: true,
            headerItems: [
                button({
                    icon: Icon.openExternal(),
                    tooltip: isWindowed
                        ? 'Return Inspector to the main app window'
                        : 'Open Inspector in a separate window',
                    intent: isWindowed ? 'primary' : null,
                    onClick: () => (isWindowed ? model.dock() : model.openWindow())
                }),
                button({
                    icon: Icon.x(),
                    text: 'Close Inspector',
                    onClick: () => XH.inspectorService.deactivate()
                }),
                button({
                    icon: Icon.reset(),
                    tooltip: 'Restore Defaults',
                    onClick: () => XH.inspectorService.restoreDefaultsAsync()
                })
            ],
            item: hframe(statsPanel(), instancesPanel())
        });

        // When popped out, redirect Blueprint portals (tooltips, popovers, dialogs) into the
        // child window, alongside the Inspector itself.
        return popupContainer ? portalProvider({portalContainer: popupContainer, item: ret}) : ret;
    }
});
