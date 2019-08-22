/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Children} from 'react';
import {hoistElemFactory, useProvidedModel} from '@xh/hoist/core';
import {box, hbox, vbox} from '@xh/hoist/cmp/layout';
import {getClassName} from '@xh/hoist/utils/react';

import {dragger} from './Dragger';
import {splitter} from './Splitter';
import {PanelModel} from '../PanelModel';

/** @private */
export const resizeContainer = hoistElemFactory(
    (props) => {
        let model = useProvidedModel(PanelModel, props),
            className = getClassName('xh-resizable', props),
            {resizable, collapsed, vertical, contentFirst, showSplitter} = model,
            items = [renderChild(model, Children.only(props.children))];

        if (showSplitter) {
            const splitterCmp = splitter({model});
            items = (contentFirst ? [...items, splitterCmp] : [splitterCmp, ...items]);
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
    }
);

function renderChild(model, child) {
    const {vertical, size, collapsed} = model,
        dim = vertical ? 'height' : 'width';

    return collapsed ?
        box(child) :
        box({item: child, [dim]: size});
}