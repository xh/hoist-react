/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH} from 'hoist/core';
import {observer} from 'hoist/mobx';
import {ContextMenuTarget, HotkeysTarget} from 'hoist/kit/blueprint';
import {defaultMethods, chainMethods, overrideMethods} from 'hoist/utils/ClassUtils';


import {EventTarget} from './mixins/EventTarget';
import {Reactive} from './mixins/Reactive';
import {elemFactory} from './elem';

/**
 * Core decorator for Components in Hoist.
 *
 * All React Components in Hoist applications should typically be decorated with this decorator.
 * Exceptions include highly specific low-level components provided to other APIs which may be
 * negatively impacted by the overhead associated with this decorator.
 *
 * Adds support for managed events, mobx reactivity, model awareness, and other convenience getters.
 */
export function HoistComponent() {

    return (C) => {
        C.isHoistComponent = true;

        //-----------
        // Mixins
        //------------
        C = Reactive(C);
        C = EventTarget(C);

        if (C.prototype.renderContextMenu) {
            C = ContextMenuTarget(C);
        }

        if (C.prototype.renderHotkeys) {
            C = HotkeysTarget(C);
        }

        defaultMethods(C, {
            /**
             * Model class which this component is rendering.  This is a shortcut getter
             * for either a 'localModel' property on the component or a 'model' placed in props.
             */
            model: {
                get() {return this.localModel ? this.localModel : this.props.model}
            },

            /**
             * Should this Component be rendered in collapsed mode?
             */
            isCollapsed: {
                get() {return this.props.isCollapsed === true}
            },

            /**
             * Alternate render method called on a HoistComponent when collapsed as per `isCollapsed`.
             */
            renderCollapsed() {
                return null;
            }
        });


        //--------------------------
        // Implementation
        //--------------------------
        chainMethods(C, {
            componentWillUnmount() {
                this.destroy();
            },

            destroy() {
                XH.safeDestroy(this.localModel);
            }
        });

        overrideMethods(C, {
            render: (sub) => function() {
                if (this.isCollapsed) {
                    return this.renderCollapsed();
                }
                return sub ? sub.apply(this) : null;
            }
        });

        // This must be last, should provide the last override of render
        C = observer(C);

        return C;
    };
}

/**
 * Create an elementFactory for a HoistComponent.
 */
export function hoistComponentFactory(C, hcArgs = {}) {
    return elemFactory(HoistComponent(hcArgs)(C));
}