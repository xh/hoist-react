import {RolesTabModel} from './RolesTabModel';
import {creates, hoistCmp} from '@xh/hoist/core';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {Icon} from '@xh/hoist/icon';
import {visualizerTab} from './visualizer/VisualizerTab';
import {inspectorTab} from './inspector/InspectorTab';

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
                        content: inspectorTab
                    },
                    {
                        id: 'visualizer',
                        // TODO: could the visualizer just be a popup that you can open?
                        title: 'Visualizer',
                        icon: Icon.chartLine(),
                        content: visualizerTab
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
