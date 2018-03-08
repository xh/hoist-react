/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isNil} from 'lodash';
import {action, observable} from 'hoist/mobx';
import {Ref} from 'hoist/utils/Ref';
import {cloneElement} from 'react';
import {ResizeHandle} from './ResizeHandle';

export function resizable(C) {
    class ResizableComponent extends C {
        @observable _isResizing = false;
        _resizableElem = new Ref();
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
                    },
                    ref: this._resizableElem.ref
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
                    return ResizeHandle({
                        key: direction,
                        direction,
                        onResizeStart: this._onResizeStart
                    });
                }
            });
        }

        @action
        _onResizeStart(e, direction) {
            console.log('start');
            this._isResizing = true;
        }

        _onResize = (e) => {
            if (!this._isResizing) return;
            const el = this._resizableElem.value,
                {clientX, clientY} = e,
                direction = this.resizeDirection;


            console.log(clientX, clientY, direction);
            console.log(e);
        }

        @action
        _onResizeEnd = () => {
            console.log('end');
            this._isResizing = false;
        }
    }

    return ResizableComponent;
}