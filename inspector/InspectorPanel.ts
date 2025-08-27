/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {instancesPanel} from '@xh/hoist/inspector/instances/InstancesPanel';
import {statsPanel} from '@xh/hoist/inspector/stats/StatsPanel';
import './Inspector.scss';

/**
 * See {@link InspectorService} for an explanation of the Hoist Inspector tool.
 */
export const inspectorPanel = hoistCmp.factory({
    displayName: 'InspectorPanel',

    render() {
        if (!XH.inspectorService.active) return null;

        return panel({
            title: `Inspector - Hoist v${XH.environmentService.get('hoistReactVersion')}`,
            icon: Icon.search(),
            className: 'xh-inspector',
            headerClassName: 'xh-inspector-panel-header',
            modelConfig: {
                defaultSize: 400,
                side: 'bottom',
                persistWith: XH.inspectorService.persistWith,
                modalSupport: true,
                errorBoundary: true,
                showModalToggleButton: true,
                showHeaderCollapseButton: false,
                xhImpl: true
            },
            compactHeader: true,
            headerItems: [
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
    }
});
