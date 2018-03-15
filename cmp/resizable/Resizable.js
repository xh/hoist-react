/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes} from 'prop-types';
import {hoistComponent, elemFactory} from 'hoist/core';
import {setter, observable, action} from 'hoist/mobx';
import {box, div, hbox, vbox} from 'hoist/layout';
import {button} from 'hoist/kit/blueprint';
import {isNil} from 'lodash';
import {resizeHandle} from './ResizeHandle';
import './Resizable.scss';

/**
 * A Resizable Container
 *
 * @prop contentSize, integer - Size of the collapsible container. If side is `left` or `right` it
 *       represents the width, otherwise it represents the height.
 * @prop isResizable, object - Can the panel be resized with drag and drop?
 * @prop isCollapsible, boolean - Can the panel be collapsed via collapse/expand toggle button
 * @prop side, string - The side of this container where resizing and collapsing will be done.
 * @prop defaultIsOpen boolean - If set to false this container will be collapsed by default.
 */
@hoistComponent()
export class Resizable extends Component {

    static propTypes = {
        isCollapsible: PropTypes.bool,
        isResizable: PropTypes.bool,
        defaultIsOpen: PropTypes.bool,
        side: PropTypes.oneOf(['top', 'right', 'bottom', 'left']),
        contentSize: PropTypes.number
    };

    static defaultProps = {
        isCollapsible: true,
        isResizable: true,
        defaultIsOpen: true,
        side: 'right'
    };

    // Main state
    @observable isOpen;
    @setter @observable contentSize;
    isLazyState = true;

    constructor(props) {
        super(props);
        const {contentSize, defaultIsOpen} = this.props;
        if (!isNil(defaultIsOpen)) this.isOpen = defaultIsOpen;

        this.setContentSize(contentSize);
    }

    get sideIsVertical() {
        const {side} = this.props;
        return side === 'top' || side === 'bottom';
    }

    get sideIsAfterContent() {
        const {side} = this.props;
        return side === 'right' || side === 'bottom';
    }

    render() {
        // Turn off lazy rendering once opened
        if (this.isOpen) this.isLazyState = false;

        const {sideIsAfterContent, sideIsVertical, isLazyState} = this,
            {isCollapsible} = this.props,
            child = isLazyState ? null : this.renderChild(),
            items = !isCollapsible ? child : (sideIsAfterContent ? [child, ...this.getCollapsibleBar()] : [...this.getCollapsibleBar(), child]),
            cmp = sideIsVertical ? vbox : hbox;

        return cmp({
            flex: 'none',
            items: [...items, this.getResizer()]
        });
    }

    //----------------------------------------
    // Implementation -- Render Affordances
    //----------------------------------------
    renderChild() {
        const {isOpen, sideIsVertical, contentSize} = this,
            {children} = this.props,
            type = sideIsVertical ? 'height' : 'width',
            size = isOpen ? contentSize : 0;

        return box({
            [type]: size,
            items: children
        });
    }

    getCollapsibleBar() {
        const {isCollapsible} = this.props;

        if (!isCollapsible) return null;

        const splitter = this.getSplitter(),
            collapseText = this.getCollapseText();

        return this.sideIsAfterContent ? [collapseText, splitter] : [splitter, collapseText];
    }

    getSplitter() {
        const {isOpen, sideIsVertical} = this;

        const cmp = sideIsVertical ? hbox : vbox,
            cfg = {
                cls: `xh-resizable-splitter ${sideIsVertical ? 'vertical' : 'horizontal'}`,
                item: button({
                    cls: 'xh-resizable-splitter-btn',
                    icon:  this.getChevron(isOpen),
                    onClick: this.onChevronClick
                })
            };

        return cmp(cfg);
    }

    getChevron(currentlyOpen) {
        const {sideIsVertical, sideIsAfterContent} = this,
            directions = [['chevron-up', 'chevron-down'], ['chevron-left', 'chevron-right']],
            type = sideIsVertical ? 0 : 1,
            idx = sideIsAfterContent ? 0 : 1;

        return currentlyOpen ? directions[type][idx] : directions[type][1 - idx];
    }

    getResizer() {
        return this.isOpen && this.props.isResizable ?
            resizeHandle({
                side: this.props.side,
                onResizeStart: this.onResizeStart,
                onResizeEnd: this.onResizeEnd,
                onResize: this.onResize
            }) : null;
    }

    getCollapseText() {
        const {props, isOpen, sideIsVertical} = this,
            {collapseText} = props;
        if (!collapseText || isOpen) return null;

        return box({
            cls: `xh-collapse-text ${sideIsVertical ? 'vertical' : 'horizontal'}`,
            item: div(collapseText)
        });
    }

    //----------------------------
    // Implementation -- Handlers
    //----------------------------
    @action
    onChevronClick = () => {
        this.isOpen = !this.isOpen;
    }

    onResizeStart = () => {
        this.startContentSize = this.contentSize;
    }

    onResizeEnd = () => {
        this.startContentSize = null;
    }

    @action
    onResize = (delta) => {
        this.contentSize = this.startContentSize + delta;
    }

}
export const resizable = elemFactory(Resizable);