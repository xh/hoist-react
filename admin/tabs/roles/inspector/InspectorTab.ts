import {hframe} from '@xh/hoist/cmp/layout';
import {HoistModel, creates, hoistCmp, managed} from '@xh/hoist/core';
import {makeObservable, observable} from 'mobx';
import {DetailPanelModel, detailPanel} from './DetailPanel';
import {mainGrid} from './MainGrid';

export class InspectorTabModel extends HoistModel {
    @observable.ref selectedRoleName = null;

    @managed detailModel = new DetailPanelModel();

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        super.onLinked();

        this.addReaction({
            track: () => this.selectedRoleName,
            run: async role => {
                this.detailModel.roleName = role;
                console.log('Inspector tab: ' + this.selectedRoleName);
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
