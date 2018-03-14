/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes} from 'prop-types';
import {elemFactory} from 'hoist/core';
import {div} from 'hoist/layout';
import './ResizeHandle.scss';

class ResizeHandle extends Component {

    resizeState = null;

    static propTypes = {
        onResizeStart: PropTypes.func,
        onResize: PropTypes.func,
        onResizeEnd: PropTypes.func,
        side: PropTypes.oneOf(['top', 'right', 'bottom', 'left']).isRequired
    }

    render() {
        const {side} = this.props;
        return div({
            cls: `xh-resize-handler ${side}`,
            onMouseDown: this.onResizeStart
        });
    }
    
    onResizeStart = (e) => {
        this.resizeState = {startX: e.clientX, startY: e.clientY};
        const {onResizeStart} = this.props;
        if (onResizeStart) onResizeStart(e);
    }

    onMouseMove = (e) => {
        if (!this.resizeState) return;

        const {side} = this.props,
            {clientX, clientY} = e,
            {startX, startY} = this.resizeState;

        let diff;

        if (side === 'right') diff = clientX - startX;
        if (side === 'left') diff = startX - clientX;
        if (side === 'top') diff = startY - clientY;
        if (side === 'bottom') diff = clientY - startY;

        const {onResize} = this.props;
        if (onResize) onResize(diff);
    }

    onResizeEnd = () => {
        this.resizeState = null;
        const {onResizeEnd} = this.props;
        if (onResizeEnd) onResizeEnd();
    }

    //-------------------
    // Lifecycle
    //---------------------
    componentDidMount() {
        window.addEventListener('mouseup', this.onResizeEnd);
        window.addEventListener('mousemove', this.onMouseMove);
    }

    componentWillUnmount() {
        window.removeEventListener('mouseup', this.onResizeEnd);
        window.removeEventListener('mousemove', this.onMouseMove);
    }
}
export const resizeHandle = elemFactory(ResizeHandle);