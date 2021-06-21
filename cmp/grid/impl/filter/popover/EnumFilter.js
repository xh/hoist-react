import {hoistCmp} from '@xh/hoist/core';
import {grid} from '@xh/hoist/cmp/grid';

export const enumFilter = hoistCmp.factory({
    render({model}) {
        return grid({
            model: model.enumFilterGridModel,
            height: 226,
            width: 240 // TODO - fix styling
        });
    }
});
