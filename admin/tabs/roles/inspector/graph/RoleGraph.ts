import {RoleGraphModel} from '@xh/hoist/admin/tabs/roles/inspector/graph/RoleGraphModel';
import {chart} from '@xh/hoist/cmp/chart';
import {creates, hoistCmp} from '@xh/hoist/core';

export const roleGraph = hoistCmp.factory({
    className: 'role-graph',
    displayName: 'RoleGraph',
    model: creates(RoleGraphModel),
    render({className}) {
        return chart({className});
    }
});
