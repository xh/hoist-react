import {grid} from '@xh/hoist/cmp/grid';
import {vbox, label} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {PinSectionModel} from './PinSectionModel';

/**
 * @internal
 * Renders a single pin zone within the ColumnChooser.
 */
export const pinSection = hoistCmp.factory<{model: PinSectionModel}>(({model}) => {
    const title =
        model.pinned === 'left'
            ? 'Pinned Left'
            : model.pinned === 'right'
              ? 'Pinned Right'
              : 'Columns';

    return vbox({
        flex: model.pinned ? 0 : 1,
        className: 'xh-column-chooser__pin-section',
        items: [
            label({item: title, className: 'xh-column-chooser__pin-section-label'}),
            grid({model: model.gridModel})
        ]
    });
});
