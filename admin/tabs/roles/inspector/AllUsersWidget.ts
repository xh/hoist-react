import {creates, hoistCmp} from '@xh/hoist/core';
import {grid} from '@xh/hoist/cmp/grid';
import {AllUsersWidgetModel} from './AllUsersWidgetModel';

export const allUsersWidget = hoistCmp.factory({
    model: creates(AllUsersWidgetModel),

    render({model}) {
        const gridModel = model.gridModel;

        return grid({model: gridModel});
    }
});
