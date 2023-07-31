import {HoistModel, XH, creates, hoistCmp, lookup, managed} from '@xh/hoist/core';
import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {makeObservable} from 'mobx';
import {RecordAction, Store} from '@xh/hoist/data';
import {InspectorTabModel} from '../../InspectorTab';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {hframe} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';

class assignedTabModel extends HoistModel {
    @lookup(() => InspectorTabModel) inspectorTab: InspectorTabModel;

    @managed store = new Store({
        fields: [{name: 'user', type: 'string'}],
        idSpec: 'user'
    });

    @managed gridModel = new GridModel({
        emptyText: 'No users assigned to this role',
        store: this.store,
        hideHeaders: true,
        columns: [{field: 'user'}],
        selModel: 'multiple'
    });

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.addReaction({
            track: () => this.inspectorTab.selectedRole,
            run: role => {
                this.store.loadData(role?.assignedUsers?.map(user => ({user})) ?? []);
            },
            fireImmediately: true
        });
    }

    addUserAction = new RecordAction({
        icon: Icon.add(),
        // text: 'Assign User',
        intent: 'success',
        actionFn: () => window.alert('User assigned')
    });

    deleteUserAction = new RecordAction({
        icon: Icon.delete(),
        // text: 'Delete',
        intent: 'danger',
        actionFn: () => window.alert('User deleted'),
        recordsRequired: true
    });
}

export const assignedTab = hoistCmp.factory({
    model: creates(assignedTabModel),

    render({model}) {
        return hframe(
            toolbar({
                item: recordActionBar({
                    selModel: model.gridModel.selModel,
                    gridModel: model.gridModel,
                    actions: [model.addUserAction, model.deleteUserAction],
                    vertical: true
                }),
                compact: true,
                vertical: true,
                omit: XH.getConf('xhAdminRoleController') != 'WRITE'
            }),
            grid({model: model.gridModel})
        );
    }
});
