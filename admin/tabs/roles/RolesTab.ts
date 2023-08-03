import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {inspectorTab} from './inspector/InspectorTab';
import {visualizerTab} from './visualizer/VisualizerTab';

export const rolesTab = hoistCmp.factory({
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
