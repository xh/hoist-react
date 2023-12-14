import {RoleGraphModel} from '@xh/hoist/admin/tabs/roles/graph/RoleGraphModel';
import {chart} from '@xh/hoist/cmp/chart';
import {placeholder} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {Highcharts} from '@xh/hoist/kit/highcharts';
import {logError} from '@xh/hoist/utils/js';

export const roleGraph = hoistCmp.factory({
    displayName: 'RoleGraph',
    model: creates(RoleGraphModel),
    render({model}) {
        if (Highcharts && !Highcharts.seriesTypes.treegraph) {
            logError(
                'Highcharts TreeGraph module not imported by this app - import and register module in Bootstrap.ts. See the XH Toolbox app for an example.'
            );
            return placeholder('Missing Highcharts TreeGraph module.');
        }
        if (!model.selectedRole) return placeholder('No role selected.');
        return chart();
    }
});
