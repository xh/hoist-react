import {HoistModel, creates, hoistCmp, lookup, managed} from '@xh/hoist/core';
import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {makeObservable} from 'mobx';
import {Store} from '@xh/hoist/data';
import {InspectorTabModel} from './InspectorTab';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {hframe, placeholder} from '@xh/hoist/cmp/layout';

class UserDetailPanelModel extends HoistModel {
    @lookup(() => InspectorTabModel) parent: InspectorTabModel;

    @managed assignedUserStore = new Store({
        fields: [{name: 'name', type: 'string'}],
        idSpec: 'name'
    });
    @managed allUserStore = new Store({
        fields: [{name: 'name', type: 'string'}],
        idSpec: 'name'
    });

    @managed assignedUsersGridModel = new GridModel({
        emptyText: 'No users assigned to this role',
        store: this.assignedUserStore,
        hideHeaders: true,
        columns: [{field: 'name'}]
    });

    @managed allUsersGridModel = new GridModel({
        emptyText: 'No user are assigned or inherit this role',
        store: this.allUserStore,
        hideHeaders: true,
        columns: [{field: 'name'}]
    });

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.addReaction({
            track: () => this.parent.selectedRole,
            run: role => {
                this.assignedUserStore.clear();
                this.allUserStore.clear();

                this.assignedUserStore.loadData(
                    role?.assignedUsers?.map((it: string, _) => ({name: it})) ?? []
                );
                this.allUserStore.loadData(
                    role?.allUsers?.map((it: string, _) => ({name: it})) ?? []
                );
            },
            debounce: 30
        });
    }
}

export const userDetailPanel = hoistCmp.factory({
    model: creates(UserDetailPanelModel),

    render({model}) {
        return panel({
            title: 'Role Details',
            item: model.parent.selectedRole
                ? hframe(
                      panel({
                          item: grid({model: model.assignedUsersGridModel}),
                          title: 'Assigned Users',
                          compactHeader: true
                      }),
                      panel({
                          item: grid({model: model.allUsersGridModel}),
                          title: 'All Users',
                          compactHeader: true
                      })
                  )
                : placeholder('Select a role to view details'),
            compactHeader: true,
            modelConfig: {
                side: 'right',
                defaultSize: '50%'
            }
        });
    }
});
