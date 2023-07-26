import {HoistModel, managed} from '@xh/hoist/core';
import {makeObservable} from '@xh/hoist/mobx';
import {RolesTabModel} from './RolesTabModel';
import {GridModel} from '@xh/hoist/cmp/grid';
import {compactDateRenderer} from '@xh/hoist/format';

export class AllRolesPanelModel extends HoistModel {
    @managed gridModel: GridModel;

    parentModel: RolesTabModel;

    get selectedRecord() {
        return this.gridModel.selectedRecord;
    }

    constructor({parentModel}) {
        super();
        makeObservable(this);
        this.parentModel = parentModel;
        this.gridModel = this.createGridModel();
    }

    private createGridModel() {
        return new GridModel({
            emptyText: 'No roles found...',
            colChooserModel: true,
            sortBy: 'name|asc',
            groupBy: 'groupName',
            store: this.parentModel.store,
            columns: [
                {field: 'name'},
                {field: 'groupName', hidden: true},
                {field: 'notes', flex: true},
                {field: 'lastUpdated', renderer: compactDateRenderer()},
                {field: 'lastUpdatedBy'}
            ]
        });
    }
}
