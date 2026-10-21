/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hframe} from '@xh/hoist/cmp/layout';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {creates, hoistCmp} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {diagnosticsPanel} from '@xh/hoist/inspector/instances/details/DiagnosticsPanel';
import {InstancesModel} from '@xh/hoist/inspector/instances/InstancesModel';
import {propertiesPanel} from '@xh/hoist/inspector/instances/details/PropertiesPanel';

export const instancesPanel = hoistCmp.factory({
    model: creates(InstancesModel),

    render({model}) {
        const {instancesPanelModel, navTabModel} = model;

        return panel({
            item: hframe(
                panel({
                    item: tabContainer({model: navTabModel}),
                    model: instancesPanelModel
                }),
                tabContainer({
                    modelConfig: {
                        persistWith: {...model.persistWith, path: 'detailTabs'},
                        xhImpl: true,
                        tabs: [
                            {
                                id: 'properties',
                                icon: Icon.fileText(),
                                content: () => propertiesPanel({model: model.propertiesModel})
                            },
                            {
                                id: 'diagnostics',
                                icon: Icon.gauge(),
                                content: () => diagnosticsPanel({model: model.diagnosticsModel})
                            }
                        ]
                    }
                })
            )
        });
    }
});
