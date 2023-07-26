import {creates, hoistCmp} from '@xh/hoist/core';
import {grid} from '@xh/hoist/cmp/grid';
import {UsersWidgetModel} from './UsersWidgetModel';

export const usersWidget = hoistCmp.factory({
    model: creates(UsersWidgetModel),

    render({model}) {
        const gridModel = model.gridModel;

        return grid({model: gridModel});
    }
});
