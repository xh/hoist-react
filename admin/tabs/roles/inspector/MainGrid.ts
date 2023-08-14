import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {fragment} from '@xh/hoist/cmp/layout';
import {HoistModel, XH, creates, hoistCmp, lookup, managed} from '@xh/hoist/core';
import {Store} from '@xh/hoist/data';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {compactDateRenderer} from '@xh/hoist/format';
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
        this.parent.mainGridModel = this.gridModel;

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
                {name: 'notes', type: 'string'}
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
            enableExport: true,
            columns: [
                {field: 'name'},
                {field: 'groupName', hidden: true},
                {field: 'lastUpdated', renderer: compactDateRenderer()},
                {field: 'lastUpdatedBy'},
                {field: 'notes', flex: 1}
            ]
        });
    }
}

export const mainGrid = hoistCmp.factory({
    model: creates(MainGridModel),

    render() {
        return fragment(
            panel({
                item: grid()
            })
        );
    }
});
