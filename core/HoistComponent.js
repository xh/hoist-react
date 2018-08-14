/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import ReactDom from 'react-dom';
import {XH} from '@xh/hoist/core';
import {observer} from '@xh/hoist/mobx';
import {defaultMethods, chainMethods} from '@xh/hoist/utils/ClassUtils';
import classNames from 'classnames';

import {ReactiveSupport} from './mixins/ReactiveSupport';
import {elemFactory} from './elem';

/**
 * Core decorator for Components in Hoist.
 *
 * All React Components in Hoist applications should typically be decorated with this decorator.
 * Exceptions include highly specific low-level components provided to other APIs which may be
 * negatively impacted by the overhead associated with this decorator.
 *
 * Adds support for managed events, mobx reactivity, model awareness, and other convenience getters.
 *
 * @param {Object} [config] - configuration for the decorator.
 * @param {boolean} [config.isReactive] - apply the ReactiveSupport and mobX Observer mixins to the component Class.
 */
export function HoistComponent({isReactive = true} = {}) {

    return (C) => {
        C.isHoistComponent = true;

        if (isReactive) {
            C = ReactiveSupport(C);
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
                return this._mounted ? ReactDom.findDOMNode(this) : null;
            },

            /**
             * Concatenate a CSS baseClassName (if defined on component) with any instance-specific
             * className provided via props and optional extra names provided at render-time.
             *
             * Components should call this to produce a combined class list and apply it to their
             * outermost (or otherwise most appropriate) rendered component.
             *
             * @param {...string} extraClassNames - additional classNames to append.
             */
            getClassName(...extraClassNames) {
                return classNames(this.baseClassName, this.props.className, ...extraClassNames);
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