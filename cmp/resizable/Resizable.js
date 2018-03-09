/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {cloneElement} from 'react';
import {frame} from 'hoist/layout';
import {action, observable} from 'hoist/mobx';
import {resizeHandle} from './ResizeHandle';
import {isNil} from 'lodash';

export const resizable = C => {
    class ResizableComponent extends C {
        @observable _isResizing = false;
        _resizeDirection = 'right';

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

        _startValues = {
            x: 0,
            y: 0,
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
            const userSelect = this._isResizing ? {
                userSelect: 'none',
                MozUserSelect: 'none',
                WebkitUserSelect: 'none',
                MsUserSelect: 'none'
            } : {
                userSelect: 'auto',
                MozUserSelect: 'auto',
                WebkitUserSelect: 'auto',
                MsUserSelect: 'auto'
            };
            const el = super.render(),
                props = {
                    ...el.props,
                    style: {
                        ...(el.props.style || {}),
                        ...userSelect
                    }
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
                    return resizeHandle({
                        key: direction,
                        direction,
                        onResizeStart: this._onResizeStart
                    });
                }
            });
        }

        @action
        _onResizeStart(e, direction) {
            this._resizeDirection = direction;

            this._startValues.y = e.clientY;
            this._startValues.x = e.clientX;
            this._isResizing = true;
        }

        _onResize = (e) => {
            if (!this._isResizing) return;
            const {clientX, clientY} = e,
                {x: startX, y: startY} = this._startValues,
                direction = this._resizeDirection,
                contentSize = this.contentSize && parseInt(this.contentSize, 10);

            let diff, size;
            if (direction === 'right') {
                diff = startX - clientX;
                this._startValues.x = clientX;
            } else if (direction === 'left') {
                diff = clientX - startX;
                this._startValues.x = clientX;
            } else if (direction === 'top') {
                diff = clientY - startY;
                this._startValues.y = clientY;
            } else if (direction === 'bottom') {
                diff = startY - clientY;
                this._startValues.y = clientY;
            }

            size = Math.max(contentSize - diff, 0);

            this.setContentSize(`${size}px`);
        }

        @action
        _onResizeEnd = () => {
            this._isResizing = false;
        }
    }

    return ResizableComponent;
}