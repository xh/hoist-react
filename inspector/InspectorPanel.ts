/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {InspectorModel} from '@xh/hoist/inspector/InspectorModel';
import {instancesPanel} from '@xh/hoist/inspector/instances/InstancesPanel';
import {statsPanel} from '@xh/hoist/inspector/stats/StatsPanel';
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
        const {windowContainer} = model;
        if (!XH.inspectorService.active || !windowContainer) return null;

        const ret = panel({
            className: 'xh-inspector',
            flex: 1,
            modelConfig: {collapsible: false, resizable: false, errorBoundary: true, xhImpl: true},
            item: hframe(statsPanel(), instancesPanel())
        });

        // Redirect Blueprint portals (tooltips, popovers, dialogs) into the Inspector window.
        return createPortal(
            portalProvider({portalContainer: windowContainer, item: ret}),
            windowContainer
        );
    }
});
