/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';
import './Dragger.scss';

/** This is an implementation class private to Hoist
 * @private
 */
@HoistComponent()
export class Dragger extends Component {

    resizeState = null;

    static propTypes = {
        /** Position of resize border in relation to resizable component */
        side: PT.oneOf(['top', 'right', 'bottom', 'left']).isRequired,
        onResizeStart: PT.func,
        onResize: PT.func,
        onResizeEnd: PT.func
    };

    render() {
        const {side} = this.props;
        return div({
            cls: `xh-resizable-dragger ${side}`,
            onDrag: this.onDrag,
            onDragStart: this.onDragStart,
            onDragEnd: this.onDragEnd,
            draggable: true
        });
    }
    
    onDragStart = (e) => {
        this.resizeState = {startX: e.clientX, startY: e.clientY};
        const {onResizeStart} = this.props;
        if (onResizeStart) onResizeStart(e);
        e.stopPropagation();
    }

    onDrag = (e) => {
        if (!this.resizeState) return;
        if (!e.buttons || e.buttons.length == 0) {
            this.onDragEnd();
            return;
        }

        const {side} = this.props,
            {screenX, screenY, clientX, clientY} = e,
            {startX, startY} = this.resizeState;

        // Skip degenerate final drag event from dropping over non-target
        if (screenX == 0 && screenY === 0 && clientX === 0 && clientY === 0) {
            return;
        }

        let diff;
        if (side === 'right') diff = clientX - startX;
        if (side === 'left') diff = startX - clientX;
        if (side === 'top') diff = startY - clientY;
        if (side === 'bottom') diff = clientY - startY;

        const {onResize} = this.props;
        if (onResize) onResize(diff);
    }

    onDragEnd = () => {
        this.resizeState = null;
        const {onResizeEnd} = this.props;
        if (onResizeEnd) onResizeEnd();
    }
}
export const dragger = elemFactory(Dragger);