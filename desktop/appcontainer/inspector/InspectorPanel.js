import {hframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {InspectorModel} from '@xh/hoist/desktop/appcontainer/inspector/InspectorModel';
import {
    modelInstancePanel
} from '@xh/hoist/desktop/appcontainer/inspector/widgets/ModelInstancePanel';
import {statsPanel} from '@xh/hoist/desktop/appcontainer/inspector/widgets/StatsPanel';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';

export const inspectorPanel = hoistCmp.factory({
    displayName: 'InspectorPanel',
    model: creates(InspectorModel),

    /** @param {InspectorModel} model */
    render({model}) {
        if (!model.enabled) return null;

        return panel({
            title: 'Hoist Inspector',
            icon: Icon.search(),
            className: 'xh-inspector-panel',
            model: {
                defaultSize: 400,
                side: 'bottom'
            },
            compactHeader: true,
            headerItems: [
                button({
                    icon: Icon.x(),
                    text: 'Close Inspector',
                    onClick: () => XH.inspectorService.disable()
                })
            ],
            item: hframe(
                statsPanel(),
                modelInstancePanel()
            )
        });
    }
});
