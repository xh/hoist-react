import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {vframe} from '@xh/hoist/cmp/layout';
import {HoistModel, XH, creates, hoistCmp, managed} from '@xh/hoist/core';
import {RecordAction, Store} from '@xh/hoist/data';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {makeObservable, observable} from 'mobx';
import {DetailPanelModel} from '../../DetailPanel';

class assignedTabModel extends HoistModel {
    @observable.ref roleDetails = null;

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
            track: () => this.lookupModel(DetailPanelModel).roleDetails,
            run: role => {
                this.store.clear();
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
        return vframe(
            toolbar({
                item: recordActionBar({
                    selModel: model.gridModel.selModel,
                    gridModel: model.gridModel,
                    actions: [model.addUserAction, model.deleteUserAction]
                }),
                compact: true,
                omit: !XH.getConf('xhRoleManagerConfig').canWrite
            }),
            grid({model: model.gridModel})
        );
    }
});
