import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {fragment, vframe} from '@xh/hoist/cmp/layout';
import {HoistModel, XH, creates, hoistCmp, lookup, managed} from '@xh/hoist/core';
import {RecordAction, Store} from '@xh/hoist/data';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {compactDateRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from 'mobx';
import {RoleDialogModel} from './Dialog';
import {InspectorTabModel} from './InspectorTab';
import './InspectorTab.scss';

// move from mainGrid to roleList or the like
export class MainGridModel extends HoistModel {
    @managed gridModel: GridModel;
    @managed formModel: FormModel;

    @managed store = this.createStore();

    // look through JS annotations to understand why this laziness is necessary
    // what determines parse order
    @lookup(() => InspectorTabModel) parent: InspectorTabModel;
    // TODO: don't need to store this here locally
    @lookup(() => RoleDialogModel) dialogModel: RoleDialogModel;

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        super.onLinked();
        this.gridModel = this.createGridModel();

        // could just look this up and store directly
        // this.rolesStore = this.lookupModel(RolesTabModel).store

        this.addReaction({
            track: () => this.gridModel.selectedRecord,
            run: record => {
                this.parent.selectedRoleName = record?.data.name;
            },
            fireImmediately: true
        });
    }

    override async doLoadAsync() {
        const resp = await XH.fetchJson({url: 'rolesAdmin'});
        this.store.loadData(resp);
    }

    private createStore() {
        return new Store({
            idSpec: 'name',
            fields: [
                {name: 'name', type: 'string'},
                {name: 'groupName', type: 'string'},
                {name: 'lastUpdated', type: 'date'},
                {name: 'lastUpdatedBy', type: 'string'},
                {name: 'color', type: 'string'}
            ]
        });
    }

    private createGridModel() {
        return new GridModel({
            emptyText: 'No roles found...',
            colChooserModel: true,
            sortBy: 'name|asc',
            groupBy: 'groupName',
            selModel: 'multiple',
            store: this.store,
            fullRowEditing: true,
            columns: [
                {field: 'name'},
                {field: 'groupName', hidden: true},
                {field: 'lastUpdated', renderer: compactDateRenderer()},
                {field: 'lastUpdatedBy'}
            ]
        });
    }

    addRoleAction = new RecordAction({
        icon: Icon.add(),
        text: 'Create Role',
        intent: 'success',
        actionFn: () => {
            this.dialogModel.openDialog('add');
        }
    });
}

export const mainGrid = hoistCmp.factory({
    model: creates(MainGridModel),

    render({model}) {
        const {gridModel} = model;

        return fragment(
            panel({
                item: vframe(
                    toolbar({
                        item: recordActionBar({
                            gridModel,
                            selModel: gridModel.selModel,
                            actions: [model.addRoleAction]
                        }),
                        omit: !XH.getConf('xhRoleManagerConfig').canWrite
                    }),
                    grid()
                )
            })
        );
    }
});
