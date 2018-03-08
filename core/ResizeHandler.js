/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React, { PropTypes } from 'prop-types';
import {div} from 'hoist/layout';
import './ResizeHandler.css';

export function ResizeHandler(props) {
    return div({
        key: props.key,
        cls: `xh-resize-handler ${props.direction}`,
        onMouseDown: (e) => props.onResizeStart(e, props.direction),
        onTouchStart: (e) => props.onResizeStart(e, props.direction)
    });
}

ResizeHandler.propTypes = {
    onResizeStart: PropTypes.func.isRequired,
    direction: PropTypes.oneOf([
        'top', 'right', 'bottom', 'left',
        'topRight', 'bottomRight', 'bottomleft', 'topLeft'
    ]).isRequired
}