/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Children} from 'react';
import {hoistCmp} from '@xh/hoist/core';
import {box, hbox, vbox} from '@xh/hoist/cmp/layout';

import {dragger} from './dragger/Dragger';
import {splitter} from './Splitter';


export const resizeContainer = hoistCmp.factory({
    displayName: 'ResizeContainer',
    model: false, memo: false,
    className: 'xh-resizable',

    render({model, className, children}, ref) {
        let {size, resizable, collapsed, vertical, contentFirst, showSplitter} = model,
            dim = vertical ? 'height' : 'width',
            child = Children.only(children),
            items = [collapsed ? box(child) : box({item: child, [dim]: size})];

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
            ref,
            className,
            flex: 'none',
            [maxDim]: '100%',
            items
        });
    }
});