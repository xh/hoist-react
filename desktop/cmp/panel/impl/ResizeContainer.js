/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {box, hbox, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {Children} from 'react';
import {PanelModel} from '../PanelModel';
import {dragger} from './dragger/Dragger';
import {splitter} from './Splitter';
import composeRefs from '@seznam/compose-react-refs';

export const resizeContainer = hoistCmp.factory({
    displayName: 'ResizeContainer',
    model: false,
    className: 'xh-resizable',

    render({className, children}, ref) {
        const panelModel = useContextModel(PanelModel);
        let {size, resizable, collapsed, vertical, contentFirst, showSplitter} = panelModel,
            dim = vertical ? 'height' : 'width',
            child = Children.only(children),
            items = [collapsed ? box(child) : box({item: child, [dim]: size})];

        if (showSplitter) {
            const splitterCmp = splitter();
            items = (contentFirst ? [...items, splitterCmp] : [splitterCmp, ...items]);
        }

        if (!collapsed && resizable) {
            items.push(dragger());
        }

        const cmp = vertical ? vbox : hbox,
            maxDim = vertical ? 'maxHeight' : 'maxWidth';


        if (panelModel._resizeRef) {
            ref = composeRefs(panelModel._resizeRef, ref);
        }

        return cmp({
            ref,
            className,
            flex: 'none',
            [maxDim]: '100%',
            items
        });
    }
});
