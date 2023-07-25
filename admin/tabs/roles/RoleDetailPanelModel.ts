import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {makeObservable, observable} from 'mobx';
import {AllRolesPanelModel} from './AllRolesPanelModel';

export class RoleDetailPanelModel extends HoistModel {
    @observable roleId = null;

    @lookup(AllRolesPanelModel) parentModel;

    @managed panelSizingModel = new PanelModel({
        defaultSize: 400,
        minSize: 250,
        maxSize: 500,
        side: 'bottom',
        renderMode: 'unmountOnHide',
        persistWith: {localStorageKey: 'roleTabState'}
    });

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.addReaction({
            track: () => this.parentModel.selectedRecord,
            run: role => {
                this.roleId = role?.id ?? null;
            },
            debounce: 300
        });
    }
}
