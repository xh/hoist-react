import {HoistModel, creates, hoistCmp, lookup, managed} from '@xh/hoist/core';
import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {makeObservable} from 'mobx';
import {RolesTabModel} from '../RolesTabModel';
import {compactDateRenderer} from '@xh/hoist/format';
import {InspectorTabModel} from './InspectorTab';

class RolesGridModel extends HoistModel {
    @managed gridModel: GridModel;

    @lookup(() => InspectorTabModel) parent: InspectorTabModel;
    @lookup(() => RolesTabModel) rolesStore: RolesTabModel;

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        super.onLinked();
        this.gridModel = this.createGridModel();

        this.addReaction({
            track: () => this.gridModel.selectedRecord,
            run: role => {
                this.parent.selectedRole = role?.data ?? null;
                console.log('role details: ' + this.parent.selectedRole);
            }
        });
    }

    private createGridModel() {
        return new GridModel({
            emptyText: 'No roles found...',
            colChooserModel: true,
            sortBy: 'name|asc',
            groupBy: 'groupName',
            store: this.rolesStore.store,
            columns: [
                {field: 'name'},
                {field: 'groupName', hidden: true},
                {field: 'lastUpdated', renderer: compactDateRenderer()},
                {field: 'lastUpdatedBy'}
            ]
        });
    }
}

export const rolesGrid = hoistCmp.factory({
    model: creates(RolesGridModel),

    render() {
        return grid();
    }
});
