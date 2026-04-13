import type {GridModel} from '@xh/hoist/cmp/grid';
import {filler, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, LayoutProps, useLocalModel} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {ColumnChooserModel} from './ColumnChooserModel';
import {pinSection} from './PinSection';
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
        const [layoutProps] = splitLayoutProps(props);
        return vbox({
            className,
            ...layoutProps,
            items: [
                toolbar({
                    items: [
                        button({
                            omit: !impl.hasColumnGroups,
                            icon: impl.showGroups ? Icon.treeList() : Icon.list(),
                            text: impl.showGroups ? 'Tree' : 'Flat',
                            onClick: () => impl.setShowGroups(!impl.showGroups)
                        }),
                        filler({omit: !impl.hasColumnGroups}),
                        textInput({
                            model: impl,
                            bind: 'filterText',
                            placeholder: 'Filter columns...',
                            leftIcon: Icon.search(),
                            enableClear: true,
                            commitOnChange: true,
                            width: null,
                            flex: 1
                        })
                    ]
                }),
                pinSection({model: impl.leftPinModel}),
                pinSection({model: impl.centerPinModel}),
                pinSection({model: impl.rightPinModel})
            ]
        });
    }
});
