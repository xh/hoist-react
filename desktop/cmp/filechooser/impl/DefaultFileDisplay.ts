import {grid} from '@xh/hoist/cmp/grid';
import {creates, hoistCmp} from '@xh/hoist/core';
import {FileDisplayModel} from './DefaultFileDisplayModel';

export const defaultFileDisplay = hoistCmp.factory({
    model: creates(FileDisplayModel),
    render() {
        return grid();
    }
});
