/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {TreeMapProps, TreeMapModel, TreeMapLocalModel} from '@xh/hoist/cmp/treemap';
import {box, div, placeholder} from '@xh/hoist/cmp/layout';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import '@xh/hoist/desktop/register';
import {getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';

/**
 * Desktop Implementation of TreeMap.
 * @internal
 */
export function treeMapImpl(props, ref) {
    const {model, localModel, className, testId, ...rest} = props as TreeMapProps & {
        model: TreeMapModel;
        localModel: TreeMapLocalModel;
    };

    // Default flex = 1 (flex: 1 1 0) if no dimensions / flex specified, i.e. do not consult child for dimensions;
    const layoutProps = getLayoutProps(rest);
    if (layoutProps.width == null && layoutProps.height == null && layoutProps.flex == null) {
        layoutProps.flex = 1;
    }

    // Render child item - note this will NOT render the actual HighCharts viz - only a shell
    // div to hold one. The chart itself will be rendered once the shell's ref resolves.
    const {error, empty, emptyText, isMasking} = model;
    let items;
    if (error) {
        items = errorMessage({error});
    } else if (empty) {
        items = placeholder(emptyText);
    } else {
        items = [
            div({
                className: 'xh-treemap__chart-holder',
                ref: localModel.chartRef
            }),
            div({
                omit: !isMasking,
                className: 'xh-treemap__mask-holder',
                item: mask({isDisplayed: true, spinner: true})
            })
        ];
    }

    return box({
        ...layoutProps,
        className: classNames(className, `xh-treemap--${localModel.theme}`),
        ref,
        testId,
        items
    });
}
