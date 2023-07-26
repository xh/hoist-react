import {RoleDetailPanelModel} from './RoleDetailPanelModel';
import {creates, hoistCmp} from '@xh/hoist/core';
import {placeholder} from '@xh/hoist/cmp/layout';
import {dashContainer} from '@xh/hoist/desktop/cmp/dash';

export const roleDetailPanel = hoistCmp.factory({
    model: creates(RoleDetailPanelModel),

    render({model}) {
        const {roleId} = model;

        return roleId ? dashContainer() : placeholder('Select a role to view details.');
    }
});
