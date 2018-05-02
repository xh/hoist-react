/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {autorun, reaction, observer} from 'hoist/mobx';
import {ContextMenuTarget, HotkeysTarget} from 'hoist/kit/blueprint';
import {addProperty, addMethods, overrideMethods} from 'hoist/utils/ClassUtils';

import {EventTarget, Reactive} from './mixins';
import {XH} from './XH';
import {elemFactory} from './elem';

/**
 * Core decorator for Components in Hoist.
 *
 * All React Components in Hoist applications should typically be decorated with
 * this decorator. Exceptions include highly specific low-level components provided
 * to other APIs which maybe negatively impacted by the overhead associated with this
 * decorator.
 *
 * Provides basic mobx and eventTarget functionality, model awareness, and other convenience
 * getters.
 */
// TODO: Bomb this to capital H
export function hoistComponent() {

    return function(C) {
        const proto = C.prototype;

        C.isHoistComponent = true;

        //-----------
        // Mixins
        //------------
        C = observer(C);
        C = Reactive(C);
        C = EventTarget(C);

        if (proto.renderContextMenu){
            C = ContextMenuTarget(C);
        }
        if (proto.renderHotkeys) {
            C = HotkeysTarget(C);
        }

        /**
         * @prop {Object} model
         *
         * Model class which this component is rendering.  This is a shortcut getter
         * for either a 'localModel' property on the component or a 'model' placed in props.
         */
        addProperty(C, {
            model: {
                get() {return this.localModel ? this.localModel : this.props.model}
            }
        });

        /**
         * @method renderCollapsed
         * @param {Object} props - react props.
         *
         * If a method renderCollapsed() is placed on a hoist component, it will be called
         * by render() when the isCollapsed property is set to true.
         */
        const baseRender = proto.render;
        overrideMethods(C, {
            render() {
                return this.props.isCollapsed === true ?
                    (this.renderCollapsed ? this.renderCollapsed() : null) :
                    (baseRender ? baseRender() : null);
            }
        });

        //--------------------------
        // Implementation
        //--------------------------
        addMethods(C, {
            componentWillUnmount() {
                this.destroy();
            }
        });

        return C;
    };
}

/**
 * Create an elementFactory for a HoistComponent.
 */
export function hoistComponentFactory(C, hcArgs = {}) {
    return elemFactory(hoistComponent(hcArgs)(C));
}