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
    static propTypes = {
        resizeHandler: PropTypes.func.isRequired,
        direction: PropTypes.oneOf([
            'top', 'right', 'bottom', 'left',
            'topRight', 'bottomRight', 'bottomleft', 'topLeft'
        ]).isRequired
    }

    render() {
        const {direction} = this.props;
        return div({
            cls: `xh-resize-handler ${direction}`,
            onMouseDown: this.onResizeStart,
            onTouchStart: this.onResizeStart
        });
    }

    onResizeStart = (e) => {
        const {direction, resizeHandler} = this.props;
        resizeHandler(e, direction);
    }
}

export const resizeHandle = elemFactory(ResizeHandle);