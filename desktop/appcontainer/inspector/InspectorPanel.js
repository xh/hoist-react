import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {InspectorModel} from '@xh/hoist/desktop/appcontainer/inspector/InspectorModel';
import {button} from '@xh/hoist/desktop/cmp/button';
import {dashContainer} from '@xh/hoist/desktop/cmp/dash';
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
            icon: Icon.rocket(),
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
            item: dashContainer()
        });
    }
});
