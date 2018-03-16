/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {hoistComponent, elemFactory} from 'hoist/core';
import {box, hbox, vbox} from 'hoist/layout';

import {ResizableModel} from './ResizableModel';
import {dragger} from './impl/Dragger';
import {collapser} from './impl/Collapser';
import './Resizable.scss';


/**
 * A Resizable Container
 *
 * This component is designed to host a fixed-height/fixed-width child within a flex box.
 * It will allow the user to manage the fixed size via drag-drop, and button based expand/collapse.
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
        model: PT.object
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
    get isLazyState()       {return this.model.isLazyState}
    get contentSize()       {return this.model.contentSize}
    get isOpen()            {return this.model.isOpen}
    get isVertical()        {return this.side === 'bottom' || this.side === 'top'}
    get isContentFirst()    {return this.side === 'right' || this.side === 'bottom'}

    render() {
        const {isVertical, isContentFirst, isCollapsible, isOpen, isDraggable, isLazyState} = this,
            cmp = isVertical ? vbox : hbox;

        let items = [];
        if (!isLazyState) {
            items.push(this.renderChild());
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
        const {isOpen, isVertical, contentSize} = this,
            {children} = this.props,
            type = isVertical ? 'height' : 'width',
            size = isOpen ? contentSize : 0;

        return box({
            [type]: size,
            items: children
        });
    }

    //-----------------
    // Needs Review.
    //------------------
    // getCollapsibleBar() {
    //     const {isCollapsible} = this.props;
    //
    //     if (!isCollapsible) return null;
    //
    //     const splitter = this.getSplitter(),
    //         collapseText = this.getCollapseText();
    //
    //     return this.sideIsAfterContent ? [collapseText, splitter] : [splitter, collapseText];
    // }


    // getCollapseText() {
    //     const {props, isOpen, sideIsVertical} = this,
    //         {collapseText} = props;
    //     if (!collapseText || isOpen) return null;
    //
    //     return box({
    //         cls: `xh-collapse-text ${sideIsVertical ? 'vertical' : 'horizontal'}`,
    //         item: div(collapseText)
    //     });
    // }

    getCollapser() {
        return collapser({
            side: this.side,
            isOpen: this.isOpen,
            onClick: this.onCollapserClick
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
    onCollapserClick = () => {
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
        this.model.setContentSize(this.startContentSize + delta);
    }
}
export const resizable = elemFactory(Resizable);