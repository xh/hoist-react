import {RolesTabModel} from './RolesTabModel';
import {creates, hoistCmp} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {allRolesPanel} from './AllRolesPanel';
import {roleDetailPanel} from './inspector/RoleDetailPanel';
import {hframe} from '@xh/hoist/cmp/layout';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {Icon} from '@xh/hoist/icon';
import {treeGraph} from './visualizer/TreeGraph';

const roleInspector = () =>
    hframe({
        items: [
            allRolesPanel(),
            panel({
                title: 'Role Details',
                item: roleDetailPanel(),
                modelConfig: {
                    side: 'right',
                    defaultSize: '50%'
                }
            })
        ]
    });

const roleVisualizer = treeGraph;

export const rolesTab = hoistCmp.factory({
    model: creates(RolesTabModel),

    render() {
        return tabContainer({
            modelConfig: {
                tabs: [
                    {
                        id: 'inspector',
                        title: 'Inspector',
                        icon: Icon.treeList(),
                        content: roleInspector
                    },
                    {
                        id: 'visualizer',
                        title: 'Visualizer',
                        icon: Icon.chartLine(),
                        content: roleVisualizer
                    }
                ],
                route: 'default.roles',
                switcher: {
                    orientation: 'left'
                }
            }
        });
    }
});
