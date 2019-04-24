/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Children, Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {hframe, hbox, vbox} from '@xh/hoist/cmp/layout';

import {dragger} from './Dragger';
import {collapser} from './Collapser';
import {PanelModel} from '../PanelModel';

/**
 * A Resizable/Collapsible Container used by Panel.
 *
 * @private
 */
@HoistComponent
export class ResizeContainer extends Component {

    static modelClass = PanelModel;

    baseClassName = 'xh-resizable';

    render() {
        let {model} = this,
            {collapsible, resizable, collapsed, vertical, contentFirst, showSplitter} = model,
            items = [this.renderChild()];
        
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
            className: this.getClassName(),
            flex: 'none',
            [maxDim]: '100%',
            items
        });
    }

    //---------------
    // Implementation
    //---------------
    renderChild() {
        const {vertical, size, collapsed} = this.model,
            dim = vertical ? 'height' : 'width',
            item = Children.only(this.props.children);

        return collapsed ?
            hframe({item}) :
            hframe({item, [dim]: size});
    }
}
export const resizeContainer = elemFactory(ResizeContainer);