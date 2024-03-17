/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import composeRefs from '@seznam/compose-react-refs';
import {box, hbox, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {isString} from 'lodash';
import {Children} from 'react';
import {PanelModel} from '../PanelModel';
import {dragger} from './dragger/Dragger';
import {splitter} from './Splitter';

export const resizeContainer = hoistCmp.factory({
    displayName: 'ResizeContainer',
    model: false,
    className: 'xh-resizable',

    render({className, children, testId}, ref) {
        const panelModel = useContextModel(PanelModel),
            {size, resizable, collapsed, vertical, contentFirst, showSplitter} = panelModel,
            dim = vertical ? 'height' : 'width',
            child = Children.only(children),
            dragBarWidth = showSplitter ? '8px' : '0px',
            sizeIsPct = isString(size) && size.endsWith('%');

        const boxSize = sizeIsPct ? `calc(100% - ${dragBarWidth})` : size;
        let items = [collapsed ? box(child) : box({item: child, [dim]: boxSize})];

        if (showSplitter) {
            const splitterCmp = splitter();
            items = contentFirst ? [...items, splitterCmp] : [splitterCmp, ...items];
        }

        if (!collapsed && resizable) {
            items.push(dragger());
        }

        const cmp = vertical ? vbox : hbox,
            maxDim = vertical ? 'maxHeight' : 'maxWidth',
            minDim = vertical ? 'minHeight' : 'minWidth',
            cmpSize = !collapsed && sizeIsPct ? size : undefined;

        if (panelModel._resizeRef) {
            ref = composeRefs(panelModel._resizeRef, ref);
        }

        return cmp({
            ref,
            className,
            flex: 'none',
            [dim]: cmpSize,
            [maxDim]: '100%',
            [minDim]: dragBarWidth,
            testId,
            items
        });
    }
});
