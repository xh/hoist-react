import {RoleGraphModel} from '@xh/hoist/admin/tabs/roles/graph/RoleGraphModel';
import {chart} from '@xh/hoist/cmp/chart';
import {placeholder} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import './RoleGraph.scss';
import {Highcharts} from '@xh/hoist/kit/highcharts';
import {logError} from '@xh/hoist/utils/js';

export const roleGraph = hoistCmp.factory({
    className: 'xh-admin-role-graph',
    displayName: 'RoleGraph',
    model: creates(RoleGraphModel),
    render({className}) {
        if (Highcharts && !Highcharts.seriesTypes.organization) {
            logError(
                'Highcharts organization + sankey modules not imported by this app - import and register modules in Bootstrap.ts. See the XH Toolbox app for an example.'
            );
            return placeholder('Missing Highcharts organization + sankey modules.');
        }
        return chart({className});
    }
});
