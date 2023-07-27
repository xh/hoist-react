import {HoistModel, creates, hoistCmp, lookup, managed} from '@xh/hoist/core';
import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {makeObservable} from 'mobx';
import {Store} from '@xh/hoist/data';
import {InspectorTabModel} from './InspectorTab';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {placeholder} from '@xh/hoist/cmp/layout';

class RoleDetailPanelModel extends HoistModel {
    @lookup(() => InspectorTabModel) parent: InspectorTabModel;

    @managed store = new Store({
        fields: [{name: 'name', type: 'string'}],
        idSpec: 'name'
    });

    @managed gridModel = new GridModel({
        emptyText: 'No inherited roles',
        store: this.store,
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
                this.store.clear();
                this.store.loadData(role?.inherits?.map((it: string, _) => ({name: it})) ?? []);
            },
            debounce: 30
        });
    }
}

export const roleDetailPanel = hoistCmp.factory({
    model: creates(RoleDetailPanelModel),

    render({model}) {
        return panel({
            title: 'Role Details',
            item: model.parent.selectedRole
                ? grid({model: model.gridModel})
                : placeholder('Select a role to view details'),
            compactHeader: true,
            modelConfig: {
                side: 'bottom',
                defaultSize: '50%'
            }
        });
    }
});
