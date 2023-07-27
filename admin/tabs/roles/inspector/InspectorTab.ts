import {hframe} from '@xh/hoist/cmp/layout';
import {HoistModel, creates, hoistCmp} from '@xh/hoist/core';
import {detailPanel} from './DetailPanel';
import {makeObservable, observable} from 'mobx';
import {mainGrid} from './MainGrid';

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
        return hframe({
            items: [mainGrid(), detailPanel()]
        });
    }
});
