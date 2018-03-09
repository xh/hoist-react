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
import './ResizeHandle.css';

class ResizeHandle extends Component {
    static propTypes = {
        onResizeStart: PropTypes.func.isRequired,
        direction: PropTypes.oneOf([
            'top', 'right', 'bottom', 'left',
            'topRight', 'bottomRight', 'bottomleft', 'topLeft'
        ]).isRequired
    }

    render() {
        const {direction, onResizeStart} = this.props;

        return div({
            cls: `xh-resize-handler ${direction}`,
            onMouseDown: (e) => onResizeStart(e, direction),
            onTouchStart: (e) => onResizeStart(e, direction)
        });
    }
}

export const resizeHandle = elemFactory(ResizeHandle);