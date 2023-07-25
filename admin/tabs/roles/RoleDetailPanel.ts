import {RoleDetailPanelModel} from './RoleDetailPanelModel';
import {creates, hoistCmp, uses} from '@xh/hoist/core';
import {fragment, hframe, p, placeholder} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon/Icon';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {AllRolesPanelModel} from './AllRolesPanelModel';

export const roleDetailPanel = hoistCmp.factory({
    model: creates(RoleDetailPanelModel),

    render({model}) {
        const {panelSizingModel, roleId} = model;

        const item = roleId
            ? roleDetails({model: model.parentModel})
            : placeholder('Select a role to view details.');

        return panel({
            model: panelSizingModel,
            title: 'Role Details',
            icon: Icon.detail(),
            item: hframe(item)
        });
    }
});

const roleDetails = hoistCmp.factory({
    model: uses(AllRolesPanelModel),

    render({model}) {
        return fragment([p(JSON.stringify(model.selectedRecord.data)), p('test')]);
    }
});
