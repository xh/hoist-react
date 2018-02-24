/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {observer} from 'hoist/mobx';
import {ContextMenuTarget} from 'hoist/kit/blueprint';

/**
 * Core Decorator for Components in Hoist.
 */
export function hoistComponent({isObserver = true} = {}) {

    return function(C) {

        const proto = C.prototype;

        //------------------------------------
        // Convenience Getters
        //------------------------------------
        if (!proto.model) {
            Object.defineProperty(proto, 'model', {
                get: function() {return this.props.model}
            });
        }

        //---------------------------------------------
        // Decorate with Blueprint Context Menu support
        //---------------------------------------------
        if (proto.renderContextMenu) {
            C = ContextMenuTarget(C);
        }

        //-------------------------
        // Mobx
        //---------------------------
        if (isObserver) {
            C = observer(C);
        }

        return C;
    };
}


