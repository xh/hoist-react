/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {setter, observable, action} from 'hoist/mobx';
import {box, hbox, vbox} from 'hoist/layout';
import {button} from 'hoist/kit/blueprint';
import {isNil} from 'lodash';
import {resizeHandle} from './ResizeHandle';

/**
 * A Resizable Container
 *
 * @prop isResizable object - An object containing all sides that should receive a resizer handle.
 * @prop isCollapsible boolean - Defines if this container should render a collapse/expand toggle button
 * @prop collapseDirection string - The direction this container will collapse (Defaults to left)
 * @prop defaultIsOpen boolean - If set to false this container will be collapsed by default.
 *
 * Notes:
 * 1 - If this container must be collapsible but not resizable, set isResizable to `false`.
 * 2 - When this container is collapsed, the resizable feature is automatically turned off.
 */

@hoistComponent()
export class Resizable extends Component {

    @observable isOpen;
    @setter @observable contentSize;
    @observable _isResizing;
    isLazyState = true;
    isResizable = false;

    static defaultProps = {
        isCollapsible: true,
        defaultIsOpen: true,
        collapseDirection: 'left',
        isResizable: {
            top: true,
            right: true,
            bottom: true,
            left: true
        }
    };

    _startPositionValues = {
        x: 0,
        y: 0
    };

    constructor(props) {
        super(props);
        const {contentSize, defaultIsOpen} = this.props;
        if (!isNil(defaultIsOpen)) this.isOpen = defaultIsOpen;

        this.setContentSize(contentSize);
    }

    render() {
        // Turn off lazy rendering once opened
        if (this.isOpen) this.isLazyState = false;

        const {isCollapsible, isResizable, collapseDirection} = this.props,
            vertical = this.isVertical(),
            splitterFirst = collapseDirection === 'right' || collapseDirection === 'bottom',
            child = this.isLazyState ? null : this.renderChild(),
            items = !isCollapsible ? child : (splitterFirst ? [this.getSplitter(), child] : [child, this.getSplitter()]),
            cmp = vertical ? vbox : hbox;

        if (isResizable !== false && this.isOpen) {
            this.isResizable = isCollapsible ? {[this.getOppositeSide(collapseDirection)]: true} : isResizable;
        } else {
            this.isResizable = false;
        }

        return cmp({
            flex: 'none',
            cls: `${this.props.cls || ''}${this._isResizing ? ' xh-unselectable' : ''}`,
            items: [...items, ...this.getResizers()]
        });
    }

    componentDidMount() {
        window.addEventListener('mousemove', this._onResize);
        window.addEventListener('touchmove', this._onResize);
        window.addEventListener('mouseup', this._onResizeEnd);
        window.addEventListener('touchend', this._onResizeEnd);
    }

    componentWillUnmount() {
        window.removeEventListener('mouseup', this._onResizeEnd);
        window.removeEventListener('touchend', this._onResizeEnd);
        window.removeEventListener('mousemove', this._onResize);
        window.removeEventListener('touchmove', this._onResize);
    }

    //------------------
    // Implementation
    //------------------
    renderChild() {
        const {props, isOpen} = this,
            {children} = props,
            type = this.isVertical() ? 'height' : 'width',
            size = isOpen ? this.contentSize : 0;

        return box({
            style: {
                [type]: size,
                transition: this._isResizing ? 'none' : 'width 0.5s, height 0.5s'
            },
            items: children
        });
    }

    getSplitter() {
        const {props, isOpen} = this,
            {isCollapsible} = props;

        if (!isCollapsible) return null;

        const vertical = this.isVertical(),
            {open: chevronOpen, close: chevronClose} = this.getChevrons(vertical),
            cmp = vertical ? hbox : vbox,
            cfg = {
                style: {background: '#959b9e'},
                justifyContent: 'center',
                alignItems: 'center',
                item: button({
                    icon:  `chevron-${isOpen ? chevronClose : chevronOpen}`,
                    style: {
                        margin: 0,
                        padding: 0,
                        width: vertical ? '70px' : '10px',
                        height: vertical ? '10px' : '70px',
                        zIndex: 10
                    },
                    onClick: this.onButtonClick
                })
            };

        cfg[vertical ? 'height' : 'width'] = 8;

        return cmp(cfg);
    }

    getResizers() {
        const isResizable = this.isResizable;

        return [
            'top', 'right', 'bottom', 'left'
        ].map(direction => {
            if (isResizable && isResizable[direction]) {
                return resizeHandle({
                    key: direction,
                    direction,
                    resizeHandler: this._onResizeStart
                });
            }
        });
    }

    @action
    onButtonClick = () => {
        this.isOpen = !this.isOpen;
    }

    isVertical() {
        const {collapseDirection} = this.props;
        return collapseDirection === 'top' || collapseDirection === 'bottom';
    }

    getOppositeSide(side) {
        const map = {left: 'right', right: 'left', top: 'bottom', bottom: 'top'};
        return map[side];
    }

    getChevrons(vertical) {
        const {collapseDirection} = this.props,
            directions = [['up', 'down'], ['left', 'right']],
            type = vertical ? 0 : 1,
            idx = collapseDirection === 'top' || collapseDirection === 'left' ? 0 : 1;

        return {
            close: directions[type][idx],
            open: directions[type][1 - idx]
        };
    }

    @action
    _onResizeStart = (e, direction) => {
        this._resizeDirection = direction;

        this._startPositionValues.y = e.clientY;
        this._startPositionValues.x = e.clientX;
        this._isResizing = true;
    }

    _onResize = (e) => {
        if (!this._isResizing) return;
        const {clientX, clientY} = e,
            {x: startX, y: startY} = this._startPositionValues,
            direction = this._resizeDirection,
            contentSize = this.contentSize && parseInt(this.contentSize, 10);

        let diff;

        if (/right/i.test(direction)) diff = startX - clientX;
        if (/left/i.test(direction)) diff = clientX - startX;
        if (/top/i.test(direction)) diff = clientY - startY;
        if (/bottom/i.test(direction)) diff = startY - clientY;

        this._startPositionValues = {x: clientX, y: clientY };

        const size = Math.max(contentSize - diff, 0);

        this.setContentSize(`${size}px`);
    }

    @action
    _onResizeEnd = () => {
        this._isResizing = false;
    }

}
export const resizable = elemFactory(Resizable);