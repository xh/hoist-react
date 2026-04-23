/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import type {GridModel} from '@xh/hoist/cmp/grid';
import {box, filler, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, LayoutProps, useLocalModel} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {splitLayoutProps} from '@xh/hoist/utils/react';

import {ColumnChooserModel} from './ColumnChooserModel';
import './ColumnChooser.scss';

export interface ColumnChooserProps extends HoistProps, LayoutProps {
    /** GridModel whose columns this chooser manages. Falls back to context lookup. */
    gridModel?: GridModel;
}

/**
 * A standalone component for managing Grid column visibility and ordering.
 * Bind to a GridModel via the `gridModel` prop or context lookup.
 */
export const [ColumnChooser, columnChooser] = hoistCmp.withFactory<ColumnChooserProps>({
    displayName: 'ColumnChooser',
    className: 'xh-column-chooser',

    render({className, ...props}) {
        const impl = useLocalModel(ColumnChooserModel),
            [layoutProps] = splitLayoutProps(props);

        return vbox({
            className,
            ...layoutProps,
            items: [
                toolbar({
                    className: 'xh-column-chooser__tbar',
                    items: [
                        textInput({
                            model: impl,
                            bind: 'filterText',
                            placeholder: 'Filter columns...',
                            leftIcon: Icon.search(),
                            enableClear: true,
                            commitOnChange: true,
                            width: null,
                            flex: 1
                        }),
                        box({
                            className: 'xh-column-chooser__toggle-all',
                            width: calcActionColWidth(1),
                            justifyContent: 'center',
                            item: aggregateVisibilityButton(impl)
                        })
                    ]
                }),
                grid({
                    model: impl.chooserGridModel,
                    flex: 1,
                    agOptions: impl.agOptions
                }),
                box({
                    className: 'xh-column-chooser__description',
                    omit: !impl.selectedDescription,
                    item: impl.selectedDescription
                }),
                toolbar({
                    items: [
                        button({
                            omit: !impl.hasColumnGroups,
                            icon: impl.showGroups ? Icon.treeList() : Icon.list(),
                            text: impl.showGroups ? 'Tree' : 'Flat',
                            onClick: () => impl.setShowGroups(!impl.showGroups)
                        }),
                        filler(),
                        button({
                            icon: Icon.reset(),
                            tooltip: 'Restore Defaults',
                            onClick: () => impl.restoreDefaultsAsync()
                        })
                    ]
                })
            ]
        });
    }
});

function aggregateVisibilityButton(impl: ColumnChooserModel) {
    const state = impl.aggregateVisibility;
    let icon, intent, tooltip;

    if (state === 'all') {
        icon = Icon.checkSquare();
        intent = 'primary';
        tooltip = 'Hide all columns';
    } else if (state === 'some') {
        icon = Icon.squareMinus();
        tooltip = 'Show all columns';
    } else {
        icon = Icon.square();
        tooltip = 'Show all columns';
    }

    return button({
        icon,
        intent,
        tooltip,
        onClick: () => impl.toggleAllVisibility()
    });
}
