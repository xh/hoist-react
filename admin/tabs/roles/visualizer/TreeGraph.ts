import {chart} from '@xh/hoist/cmp/chart';
import {creates, hoistCmp} from '@xh/hoist/core';
import {TreeGraphModel} from './TreeGraphModel';

export const treeGraph = hoistCmp.factory({
    model: creates(TreeGraphModel),

    render() {
        return chart();
    }
});
