import {hframe} from '@xh/hoist/cmp/layout';
import {HoistModel, creates, hoistCmp, managed} from '@xh/hoist/core';
import {makeObservable, observable} from 'mobx';
import {DetailPanelModel, detailPanel} from './DetailPanel';
import {mainGrid} from './MainGrid';

export class InspectorTabModel extends HoistModel {
    @observable.ref selectedRoleId = null;

    @managed detailModel = new DetailPanelModel();

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        super.onLinked();

        this.addReaction({
            track: () => this.selectedRoleId,
            run: async role => {
                this.detailModel.roleId = role;
            },
            fireImmediately: true
        });
    }
}

export const inspectorTab = hoistCmp.factory({
    model: creates(InspectorTabModel),

    render({model}) {
        return hframe(mainGrid(), detailPanel());
    }
});
