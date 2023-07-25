import {hoistCmp, uses} from '@xh/hoist/core';
import {grid} from '@xh/hoist/cmp/grid';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {AllRolesPanelModel} from './AllRolesPanelModel';

export const allRolesPanel = hoistCmp.factory({
    model: uses(AllRolesPanelModel),

    render() {
        return panel({
            item: grid()
        });
    }
});
