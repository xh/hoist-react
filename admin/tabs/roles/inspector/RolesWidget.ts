import {creates, hoistCmp} from '@xh/hoist/core';
import {RolesWidgetModel} from './RolesWidgetModel';
import {grid} from '@xh/hoist/cmp/grid';

export const rolesWidget = hoistCmp.factory({
    model: creates(RolesWidgetModel),

    render({model}) {
        const gridModel = model.gridModel;

        return grid({model: gridModel});
    }
});
