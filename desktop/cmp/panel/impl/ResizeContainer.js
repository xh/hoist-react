/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Children} from 'react';
import {hoistComponent, useClassName, useProvidedModel} from '@xh/hoist/core';
import {box, hbox, vbox} from '@xh/hoist/cmp/layout';

import {dragger} from './Dragger';
import {collapser} from './Collapser';
import {PanelModel} from '../PanelModel';

/**
 * A Resizable/Collapsible Container used by Panel.
 *
 * @private
 */
export const [ResizeContainer, resizeContainer] = hoistComponent(props => {
    let model = useProvidedModel(PanelModel, props),
        className = useClassName('xh-resizable', props),
        {collapsible, resizable, collapsed, vertical, contentFirst, showSplitter} = model,
        items = [renderChild(model, Children.only(props.children))];

    if (collapsible && showSplitter) {
        const collapserCmp = collapser({model});
        items = (contentFirst ? [...items, collapserCmp] : [collapserCmp, ...items]);
    }

    if (!collapsed && resizable) {
        items.push(dragger({model}));
    }

    const cmp = vertical ? vbox : hbox,
        maxDim = vertical ? 'maxHeight' : 'maxWidth';

    return cmp({
        className,
        flex: 'none',
        [maxDim]: '100%',
        items
    });
});

function renderChild(model, child) {
    const {vertical, size, collapsed} = model,
        dim = vertical ? 'height' : 'width';

    return collapsed ?
        box(child) :
        box({item: child, [dim]: size});
}