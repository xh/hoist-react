/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import ReactDom from 'react-dom';
import {XH} from '@xh/hoist/core';
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
             * Alternate render method called on a HoistComponent when isCollapsed == true.
             */
            renderCollapsed() {
                return null;
            },

            /**
             * Is this component in the DOM and not within a hidden sub-tree (e.g. hidden tab).
             * Based on the underlying css 'display' property of all ancestor properties.
             */
            isDisplayed: {
                get() {
                    let elem = this.getDOMNode();
                    if (!elem) return false;
                    while (elem) {
                        if (elem.style.display == 'none') return false;
                        elem = elem.parentElement;
                    }
                    return true;
                }
            },

            /**
             * Get the DOM element underlying this component.
             * Returns null if component is not mounted.
             */
            getDOMNode() {
                return this._mounted ?
                    ReactDom.findDOMNode(this) :
                    null;
            }
        });


        //--------------------------
        // Implementation
        //--------------------------
        chainMethods(C, {
            componentDidMount() {
                this._mounted = true;
            },

            componentWillUnmount() {
                this._mounted = false;
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