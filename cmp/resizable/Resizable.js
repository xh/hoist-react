/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React, {Component, Children} from 'react';
import {PropTypes as PT} from 'prop-types';
import {hoistComponent, elemFactory} from 'hoist/core';
import {box, hbox, vbox} from 'hoist/layout';

import {ResizableModel} from './ResizableModel';
import {dragger} from './impl/Dragger';
import {collapser} from './impl/Collapser';

/**
 * A Resizable/Collapsible Container
 *
 * This component is designed to host a fixed-height/fixed-width child within a flex box.
 * It will allow the user to manage the fixed size via drag-drop, and button based expand/collapse.
 *
 * When collapsed, it will show either the configured 'collapsedDisplay' element, or, if the child panel
 * is a HoistComponent, the child component with the property isCollapsed: true.
 *
 * Applications should provide optional values for isOpen, contentSize, and prefName.
 * Applications may provide this object with an instance of ResizableModel.
 *
 * @prop side, string - The side of this container where resizing and collapsing will be done.
 * @prop isCollapsible, boolean - Can the panel be collapsed via collapse/expand toggle button
 * @prop isDraggable, object - Can the panel be resized with drag and drop?
 * @prop side, string - The side of this container where resizing and collapsing will be done.
 * @prop isOpen, boolean - If the content panel showing?
 * @prop contentSize, integer - Size of the content panel. If side is `left` or `right` it
 *       represents the width, otherwise it represents the height.
 * @prop collapsedDisplay, React Element.  N
 * @prop prefName, string, Preference name to optionally store state in for this component.
 */
@hoistComponent()
export class Resizable extends Component {

    static propTypes = {
        isCollapsible: PT.bool,
        isDraggable: PT.bool,
        side: PT.oneOf(['top', 'right', 'bottom', 'left']).isRequired,
        contentSize: PT.number.isRequired,
        isOpen: PT.bool,
        prefName: PT.string,
        model: PT.object,
        collapsedDisplay: PT.object
    };

    static defaultProps = {
        isCollapsible: true,
        isDraggable: true
    };

    constructor(props) {
        super(props);

        if (!props.model) {
            this.localModel = new ResizableModel({
                contentSize: props.contentSize,
                isOpen: props.isOpen,
                prefName: props.prefName
            });
        }
    }

    get side()              {return this.props.side}
    get isCollapsible()     {return this.props.isCollapsible}
    get isDraggable()       {return this.props.isDraggable}
    get collapsedDisplay()   {return this.props.collapsedDisplay}
    get isLazyState()       {return this.model.isLazyState}
    get contentSize()       {return this.model.contentSize}
    get isOpen()            {return this.model.isOpen}
    get isVertical()        {return this.side === 'bottom' || this.side === 'top'}
    get isContentFirst()    {return this.side === 'right' || this.side === 'bottom'}

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

        return cmp({flex: 'none', items});
    }

    //----------------------------------------
    // Implementation -- Render Affordances
    //----------------------------------------
    renderChild() {
        const {isVertical, contentSize} = this,
            dim = isVertical ? 'height' : 'width';

        let child = Children.only(this.props.children);
        if (child.type.isHoistComponent) {
            child = React.cloneElement(child, {isCollapsed: false});
        }

        return box({
            [dim]: contentSize,
            items: child
        });
    }

    renderCollapsedChild() {
        const {collapsedDisplay, props} = this;

        let child = Children.only(props.children);
        if (collapsedDisplay) {
            child = collapsedDisplay;
        } else if (child.type.isHoistComponent) {
            child = React.cloneElement(child, {isCollapsed: true});
        } else {
            child = null;
        }

        return box({
            item: child,
            onDoubleClick: this.onCollapseToggle
        });
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
    }

    onResizeEnd = () => {
        this.startContentSize = null;
    }

    onResize = (delta) => {
        if (this.startContentSize !== null) {
            this.model.setContentSize(this.startContentSize + delta);
        }
    }
}
export const resizable = elemFactory(Resizable);