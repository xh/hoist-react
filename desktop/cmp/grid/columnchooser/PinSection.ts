import {box} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {PinSectionModel} from './PinSectionModel';

/**
 * @internal
 * Renders a single pin zone within the ColumnChooser.
 */
export const pinSection = hoistCmp.factory<{model: PinSectionModel}>(({model}) =>
    box({item: `Pin zone: ${model.pinned ?? 'center'}`})
);
