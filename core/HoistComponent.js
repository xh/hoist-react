/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {cloneElement} from 'react';
import {observer} from '@xh/hoist/mobx';
import {ContextMenuTarget, HotkeysTarget} from '@xh/hoist/kit/blueprint';
import {defaultMethods, chainMethods, overrideMethods} from '@xh/hoist/utils/ClassUtils';


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
export function HoistComponent({
    isReactive = true,
    isEventTarget = false,
    layoutSupport = false
} = {}) {

    return (C) => {
        C.isHoistComponent = true;
        C.layoutSupport = layoutSupport;

        //-----------
        // Mixins
        //------------
        if (isReactive) {
            C = Reactive(C);
        }

        if (isEventTarget) {
            C = EventTarget(C);
        }

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

            layoutConfig: {
                get() {return this.props.layoutConfig}
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

                let el = sub ? sub.apply(this) : null;

                if (el) {
                    const classes = new Set();
                    if (this.props.className) classes.add(this.props.className);
                    if (el.props.className) classes.add(el.props.className);
                    if (C.baseCls) classes.add(C.baseCls);

                    if (classes.size) {
                        el = cloneElement(el, {
                            ...el.props,
                            className: Array.from(classes).join(' ')
                        });
                    }
                }

                return el;
            }
        });

        // This must be last, should provide the last override of render
        if (isReactive) {
            C = observer(C);
        }

        return C;
    };
}

/**
 * Create an elementFactory for a HoistComponent.
 */
export function hoistComponentFactory(C, hcArgs = {}) {
    return elemFactory(HoistComponent(hcArgs)(C));
}