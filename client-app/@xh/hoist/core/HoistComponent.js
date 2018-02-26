/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {observer} from 'hoist/mobx';
import {ContextMenuTarget, HotkeysTarget} from 'hoist/kit/blueprint';
import {hoistModel} from './HoistModel';

/**
 * Core Decorator for Components in Hoist.
 */
export function hoistComponent({isObserver = true} = {}) {

    return function(C) {
        const proto = C.prototype;

        //--------------------------------------------------------------------
        // Convenience Getters.  TODO: Provide via CONTEXT, rather than import?
        //---------------------------------------------------------------------
        addProperty(C, 'darkTheme', {
            get() {return hoistModel.darkTheme}
        });

        addProperty(C, 'model', {
            get() {return this.localModel ? this.localModel : this.props.model}
        });
        
        //---------------------------------------------
        // Decorate with Blueprint Context Menu, HotKeys support
        //---------------------------------------------
        if (proto.renderContextMenu) {
            C = ContextMenuTarget(C);
        }

        if (proto.renderHotkeys) {
            C = HotkeysTarget(C);
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


function addProperty(C, name,  cfg) {
    const proto = C.prototype;
    if (!proto[name]) {
        Object.defineProperty(proto, name, cfg);
    }
}


