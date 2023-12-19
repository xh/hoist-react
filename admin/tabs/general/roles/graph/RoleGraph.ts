import {RoleGraphModel} from '@xh/hoist/admin/tabs/general/roles/graph/RoleGraphModel';
import {RoleModel} from '@xh/hoist/admin/tabs/general/roles/RoleModel';
import {chart} from '@xh/hoist/cmp/chart';
import {placeholder} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {Highcharts} from '@xh/hoist/kit/highcharts';
import {logError} from '@xh/hoist/utils/js';

export const roleGraph = hoistCmp.factory({
    displayName: 'RoleGraph',
    model: creates(RoleGraphModel),
    render({model}) {
        return panel({
            compactHeader: true,
            icon: Icon.idBadge(),
            title: model.selectedRole?.name ?? 'Relationships',
            item: content(),
            bbar: toolbar({
                item: select({
                    bind: 'relationship',
                    enableClear: false,
                    enableFilter: false,
                    options: [
                        {
                            value: 'effective',
                            label: `Roles with access to "${model.selectedRole?.name}"`
                        },
                        {
                            value: 'inherited',
                            label: `Roles "${model.selectedRole?.name}" has access to`
                        }
                    ],
                    width: 400
                }),
                omit: !model.selectedRole
            }),
            modelConfig: {
                defaultSize: '25%',
                minSize: 150,
                modalSupport: true,
                persistWith: {...RoleModel.PERSIST_WITH, path: 'graphPanel'},
                side: 'bottom'
            }
        });
    }
});

const content = hoistCmp.factory<RoleGraphModel>(({model}) => {
    if (Highcharts && !Highcharts.seriesTypes.treegraph) {
        logError(
            'Highcharts TreeGraph module not imported by this app - import and register module in Bootstrap.ts. See the XH Toolbox app for an example.'
        );
        return placeholder('Missing Highcharts TreeGraph module.');
    }
    if (!model.selectedRole) return placeholder('No role selected.');
    return chart();
});
