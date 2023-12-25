import {RoleGraphModel} from '@xh/hoist/admin/tabs/general/roles/graph/RoleGraphModel';
import {RoleModel} from '@xh/hoist/admin/tabs/general/roles/RoleModel';
import {chart} from '@xh/hoist/cmp/chart';
import {placeholder} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {Highcharts} from '@xh/hoist/kit/highcharts';
import {logError} from '@xh/hoist/utils/js';

export const roleGraph = hoistCmp.factory({
    displayName: 'RoleGraph',
    model: creates(RoleGraphModel),
    render({model}) {
        const {role} = model;
        return panel({
            compactHeader: true,
            icon: Icon.idBadge(),
            title: role ? `Relationships - ${role.name} ` : 'Relationships',
            item: content(),
            tbar: toolbar({
                item: buttonGroupInput({
                    bind: 'relationship',
                    items: [
                        button({
                            value: 'inherited',
                            text: `Inherited BY this Role (${role?.inheritedRoles.length})`
                        }),
                        button({
                            value: 'effective',
                            text: `Inheriting FROM this Role (${role?.effectiveRoles.length})`
                        })
                    ],
                    width: 400
                }),
                omit: !role
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
    const {role} = model;
    if (!Highcharts?.seriesTypes.treegraph) {
        logError(
            [
                'Highcharts TreeGraph module not imported by this app. ',
                'Import and register module in Bootstrap.ts. See the XH Toolbox app for an example.'
            ],
            'RoleGraph'
        );
        return placeholder('Missing Highcharts TreeGraph module.');
    }
    if (!role) return placeholder('No role selected.');
    return chart();
});
