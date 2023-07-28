import {HoistModel, creates, hoistCmp, lookup} from '@xh/hoist/core';
import {makeObservable} from 'mobx';
import {InspectorTabModel} from './InspectorTab';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {usersTabContainer} from './detail/UsersTabContainer';
import {roleDetails} from './detail/RoleDetails';
import {hr, placeholder, vframe} from '@xh/hoist/cmp/layout';

class DetailPanelModel extends HoistModel {
    @lookup(() => InspectorTabModel) inspectorTab: InspectorTabModel;

    constructor() {
        super();
        makeObservable(this);
    }
}

export const detailPanel = hoistCmp.factory({
    model: creates(DetailPanelModel),

    render({model}) {
        return panel({
            title: 'Role Details',
            item: model.inspectorTab.selectedRole
                ? vframe(
                      roleDetails(),
                      hr({
                          style: {
                              width: '60%',
                              border: 'var(--xh-border-solid)'
                          }
                      }),
                      usersTabContainer()
                  )
                : placeholder('Select a role to view details'),
            compactHeader: true,
            modelConfig: {
                side: 'right',
                defaultSize: '70%'
            }
        });
    }
});
