/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React, {Children, Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {box, hbox, vbox} from '@xh/hoist/cmp/layout';
import {throwIf} from '@xh/hoist/utils/JsUtils';

import {ResizableModel} from './ResizableModel';
import {dragger} from './impl/Dragger';
import {collapser} from './impl/Collapser';

/**
 * A Resizable/Collapsible Container used by Panel to implement SizableSupport.
 *
 * @private
 */
@HoistComponent()
export class Resizable extends Component {
    
    get side()              {return this.props.side}
    get isCollapsible()     {return this.props.isCollapsible !== false}
    get isDraggable()       {return this.props.isDraggable !== false}
    get contentSize()       {return this.model.contentSize}
    get isOpen()            {return this.model.isOpen}
    get isVertical()        {return this.side === 'bottom' || this.side === 'top'}
    get isContentFirst()    {return this.side === 'right' || this.side === 'bottom'}

    baseClassName = 'xh-resizable';

    render() {
        const {isVertical, isContentFirst, isCollapsible, isOpen, isDraggable} = this,
            cmp = isVertical ? vbox : hbox;

        let items = [];
        if (isOpen) {
            items.push(this.renderChild());
        } else {
            items.push(this.renderCollapsedChild());
        }

        if (isCollapsible) {
            const collapser = this.getCollapser();
            items = (isContentFirst ? [...items, collapser] : [collapser, ...items]);
        }

        if (isOpen && isDraggable) {
            items.push(this.getDragger());
        }

        return cmp({
            className: this.getClassName(),
            flex: 'none',
            items
        });
    }

    //----------------------------------------
    // Implementation -- Render Affordances
    //----------------------------------------
    renderChild() {
        const {isVertical, contentSize} = this,
            dim = isVertical ? 'height' : 'width';

        let child = Children.only(this.props.children);
        if (child.type.hasCollapseSupport) {
            child = React.cloneElement(child, {collapsed: false});
        }

        return box({
            [dim]: contentSize,
            items: child
        });
    }

    renderCollapsedChild() {
        const {props} = this;

        let child = Children.only(props.children);

        throwIf(
            !child.type.hasCollapseSupport,
            'Cannot place non-collapsible child component in Resizable with isCollapsible=true'
        )

        child = React.cloneElement(child, {collapsed: this.side});

        return box(child);
    }

    getCollapser() {
        return collapser({
            side: this.side,
            isOpen: this.isOpen,
            onClick: this.onCollapseToggle
        });
    }

    getDragger() {
        return dragger({
            side: this.side,
            onResizeStart: this.onResizeStart,
            onResizeEnd: this.onResizeEnd,
            onResize: this.onResize
        });
    }

    //----------------------------
    // Implementation -- Handlers
    //----------------------------
    onCollapseToggle = () => {
        const model = this.model;
        model.setIsOpen(!model.isOpen);
    }

    onResizeStart = () => {
        this.startContentSize = this.contentSize;
        this.model.setIsResizing(true);
    }

    onResizeEnd = () => {
        this.startContentSize = null;
        this.model.setIsResizing(false);
    }

    onResize = (delta) => {
        if (this.startContentSize !== null) {
            this.model.setContentSize(this.startContentSize + delta);
        }
    }
}
export const resizable = elemFactory(Resizable);