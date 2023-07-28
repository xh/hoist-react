import {HoistModel, creates, hoistCmp, lookup, managed} from '@xh/hoist/core';
import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {makeObservable} from 'mobx';
import {RolesTabModel} from '../RolesTabModel';
import {compactDateRenderer} from '@xh/hoist/format';
import {InspectorTabModel} from './InspectorTab';
import {vframe} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';

class MainGridModel extends HoistModel {
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

export const mainGrid = hoistCmp.factory({
    model: creates(MainGridModel),

    render() {
        return vframe(
            toolbar({
                items: [
                    button({
                        icon: Icon.add(),
                        text: 'Add User',
                        intent: 'success'
                    }),
                    button({
                        icon: Icon.edit(),
                        text: 'Edit',
                        intent: 'primary'
                    }),
                    button({
                        icon: Icon.delete(),
                        text: 'Delete',
                        intent: 'danger'
                    })
                ],
                compact: true
                // vertical: true
            }),
            grid()
        );
    }
});
