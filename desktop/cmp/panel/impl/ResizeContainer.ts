/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {useComposedRefs} from '@xh/hoist/utils/react';
import {box, hbox, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {isString} from 'lodash';
import {Children} from 'react';
import {PanelModel} from '../PanelModel';
import {splitter} from './Splitter';

export const resizeContainer = hoistCmp.factory({
    displayName: 'ResizeContainer',
    model: false,
    className: 'xh-resizable',

    render({className, children, testId, domAttrs}, ref) {
        const panelModel = useContextModel(PanelModel),
            {size, resizable, collapsed, vertical, contentFirst, showSplitter} = panelModel,
            dim = vertical ? 'height' : 'width',
            child = Children.only(children),
            splitterSize = showSplitter ? '1px' : '0px',
            sizeIsPct = isString(size) && size.endsWith('%');

        const boxSize = sizeIsPct ? `calc(100% - ${splitterSize})` : size;
        // Keyed so content is never remounted when a line-less splitter comes or goes.
        let items = [box({key: 'content', item: child, [dim]: collapsed ? null : boxSize})];

        // Without a visible splitter, a resizable panel still gets a line-less splitter as its
        // hit area for dragging and keyboard resizing.
        if (showSplitter || (resizable && !collapsed)) {
            const splitterCmp = splitter({key: 'splitter'});
            items = contentFirst ? [...items, splitterCmp] : [splitterCmp, ...items];
        }

        const cmp = vertical ? vbox : hbox,
            maxDim = vertical ? 'maxHeight' : 'maxWidth',
            minDim = vertical ? 'minHeight' : 'minWidth',
            cmpSize = !collapsed && sizeIsPct ? size : undefined;

        ref = useComposedRefs(panelModel._resizeRef, ref);

        return cmp({
            ref,
            className,
            flex: 'none',
            [dim]: cmpSize,
            [maxDim]: '100%',
            [minDim]: splitterSize,
            testId,
            domAttrs,
            items
        });
    }
});
