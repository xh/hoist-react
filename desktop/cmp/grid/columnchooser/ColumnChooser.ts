import type {GridModel} from '@xh/hoist/cmp/grid';
import {box} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, LayoutProps, useLocalModel} from '@xh/hoist/core';
import {ColumnChooserModel} from './ColumnChooserModel';
import './ColumnChooser.scss';

export interface ColumnChooserProps extends HoistProps, LayoutProps {
    /** GridModel whose columns this chooser manages. Falls back to context lookup. */
    gridModel?: GridModel;
}

/**
 * A standalone component for managing Grid column visibility, ordering, and pinning.
 * Bind to a GridModel via the `gridModel` prop or context lookup.
 */
export const [ColumnChooser, columnChooser] = hoistCmp.withFactory<ColumnChooserProps>({
    displayName: 'ColumnChooser',
    className: 'xh-column-chooser',
    render({className, ...props}) {
        const impl = useLocalModel(ColumnChooserModel);
        return box({
            className,
            item: `ColumnChooser bound to: ${impl.gridModel ? 'GridModel' : 'nothing'}`
        });
    }
});
