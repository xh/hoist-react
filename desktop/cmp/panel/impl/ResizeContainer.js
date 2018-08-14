/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Children, Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {box, hbox, vbox} from '@xh/hoist/cmp/layout';

import {dragger} from './Dragger';
import {collapser} from './Collapser';

/**
 * A Resizable/Collapsible Container used by Panel to implement SizableSupport.
 *
 * @private
 */
@HoistComponent()
export class ResizeContainer extends Component {
    
    baseClassName = 'xh-resizable';

    render() {
        let {model} = this,
            {collapsible, resizable, collapsed, vertical, contentFirst} = model,
            items = [this.renderChild()];
        
        if (collapsible) {
            const collapserCmp = collapser({model});
            items = (contentFirst ? [...items, collapserCmp] : [collapserCmp, ...items]);
        }
        if (!collapsed && resizable) {
            items.push(dragger({model}));
        }

        const cmp = vertical ? vbox : hbox;
        return cmp({
            className: this.getClassName(),
            flex: 'none',
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
            box({item}) :
            box({item, [dim]: size});
    }
}
export const resizeContainer = elemFactory(ResizeContainer);