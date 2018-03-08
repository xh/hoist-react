/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isNil} from 'lodash';
import {setter, observable} from 'hoist/mobx';
import {cloneElement} from 'react';
import {ResizeHandler} from './ResizeHandler';

export function resizable(C) {
    class ResizableComponent extends C {
        _isResizing = false;
        resizeDirection = 'right';
        _resizable = null;
        isResizable = {
            topLeft: true,
            top: true,
            topRight: true,
            right: true,
            bottomRight: true,
            bottom: true,
            bottomLeft: true,
            left: true
        };

        constructor(props) {
            super(props);

            this._onResizeStart = this._onResizeStart.bind(this);
            window.addEventListener('mousemove', this._onResize);
            window.addEventListener('touchmove', this._onResize);
            window.addEventListener('mouseup', this._onResizeEnd);
            window.addEventListener('touchend', this._onResizeEnd);
        }

        render() {
            const el = super.render(),
                blockSelect = this._isResizing,
                props = {
                    ...el.props,
                    style: {
                        ...(el.props.style || {}),
                        ...blockSelect
                    },
                    ref: (c) => { this._resizable = c;}
                };

            return cloneElement(
                el,
                props,
                [el.props.children, this.renderResizers()]
            )

        }

        componentWillUnmount() {
            if (super.componentWillUnmount) super.componentWillUnmount();

            window.removeEventListener('mouseup', this._onResizeEnd);
            window.removeEventListener('touchend', this._onResizeEnd);
            window.removeEventListener('mousemove', this._onResize);
            window.removeEventListener('touchmove', this._onResize);

        }

        renderResizers() {
            const isResizable = this.props.isResizable || this.isResizable;

            return [
                'top', 'right', 'bottom', 'left', 'topRight', 'bottomRight', 'bottomLeft', 'topLeft',
            ].map(direction => {
                if (isResizable && isResizable[direction]) {
                    return ResizeHandler({
                        key: direction,
                        direction,
                        onResizeStart: this._onResizeStart
                    });
                }
            });
        }

        _onResizeStart(e, direction) {
            console.log('start');
            this._isResizing = true;
        }

        _onResize = (e) => {
            if (!this._isResizing) return;
            const {clientX, clientY} = e,
                direction = this.resizeDirection;

            console.log(clientX, clientY, direction);
            console.log(e);
        }

        _onResizeEnd = () => {
            console.log('end');
            this._isResizing = false;
        }
    }

    return ResizableComponent;
}