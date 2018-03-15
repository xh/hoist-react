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
import {box, hbox, vbox} from 'hoist/layout';
import {button} from 'hoist/kit/blueprint';
import {isNil} from 'lodash';
import {resizeHandle} from './ResizeHandle';

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

    // Resizing state
    @observable isResizing;

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
            items = !isCollapsible ? child : (sideIsAfterContent ? [child, this.getSplitter()] : [this.getSplitter(), child]),
            cmp = sideIsVertical ? vbox : hbox;

        return cmp({
            flex: 'none',
            cls: `${this.props.cls || ''}${false ? ' xh-unselectable' : ''}`,
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

    getSplitter() {
        const {isOpen, sideIsVertical} = this,
            {isCollapsible} = this.props;

        if (!isCollapsible) return null;

        const cmp = sideIsVertical ? hbox : vbox,
            cfg = {
                style: {background: '#959b9e'},
                justifyContent: 'center',
                alignItems: 'center',
                item: button({
                    icon:  this.getChevron(isOpen),
                    style: {
                        margin: 0,
                        padding: 0,
                        width: sideIsVertical ? '70px' : '10px',
                        height: sideIsVertical ? '10px' : '70px',
                        zIndex: 10
                    },
                    onClick: this.onChevronClick
                })
            };

        cfg[sideIsVertical ? 'height' : 'width'] = 8;

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

    //----------------------------
    // Implementation -- Handlers
    //----------------------------
    @action
    onChevronClick = () => {
        this.isOpen = !this.isOpen;
    }

    @action
    onResizeStart = () => {
        this.isResizing = true;
        this.startContentSize = this.contentSize;
    }

    @action
    onResizeEnd = () => {
        this.isResizing = false;
        this.startContentSize = null;
    }

    @action
    onResize = (delta) => {
        this.contentSize = this.startContentSize + delta;
    }

}
export const resizable = elemFactory(Resizable);