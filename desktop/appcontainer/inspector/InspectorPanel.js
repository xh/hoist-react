import {hframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, XH} from '@xh/hoist/core';
import {modelsPanel} from '@xh/hoist/desktop/appcontainer/inspector/models/ModelsPanel';
import {statsPanel} from '@xh/hoist/desktop/appcontainer/inspector/stats/StatsPanel';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import './Inspector.scss';

export const inspectorPanel = hoistCmp.factory({
    displayName: 'InspectorPanel',

    render() {
        if (!XH.inspectorService.active) return null;

        return panel({
            title: `Inspector - Hoist v${XH.environmentService.get('hoistReactVersion')}`,
            icon: Icon.search(),
            className: 'xh-inspector',
            model: {
                defaultSize: 400,
                side: 'bottom'
            },
            compactHeader: true,
            headerItems: [
                button({
                    icon: Icon.x(),
                    text: 'Close Inspector',
                    onClick: () => XH.inspectorService.deactivate()
                })
            ],
            item: hframe(
                statsPanel(),
                modelsPanel()
            )
        });
    }
});
