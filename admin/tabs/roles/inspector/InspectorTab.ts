import {hframe, vframe} from '@xh/hoist/cmp/layout';
import {HoistModel, creates, hoistCmp} from '@xh/hoist/core';
import {detailPanel} from './DetailPanel';
import {makeObservable, observable} from 'mobx';
import {mainGrid} from './MainGrid';
import {changesToolbar as changesToolbar} from './ChangesToolbar';

export class InspectorTabModel extends HoistModel {
    @observable.ref selectedRole = null;

    constructor() {
        super();
        makeObservable(this);
    }
}

export const inspectorTab = hoistCmp.factory({
    model: creates(InspectorTabModel),

    render() {
        // TODO: make the mainGrid a panel as well
        return vframe(changesToolbar(), hframe(mainGrid(), detailPanel()));
    }
});
