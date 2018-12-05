/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import ReactDom from 'react-dom';
import {XH} from '@xh/hoist/core';
import {observer} from '@xh/hoist/mobx';
import {isPlainObject} from 'lodash';
import {defaultMethods, chainMethods, markClass} from '@xh/hoist/utils/js';
import classNames from 'classnames';

import {ReactiveSupport} from './mixins/ReactiveSupport';

/**
 * Core decorator for Components in Hoist.
 *
 * All React Components in Hoist applications should typically be decorated with this decorator.
 * Exceptions include highly specific low-level components provided to other APIs which may be
 * negatively impacted by the overhead associated with this decorator.
 *
 * Adds support for MobX reactivity, model awareness, and other convenience methods below.
 */
export function HoistComponent(C) {

    markClass(C, 'isHoistComponent');

    C = ReactiveSupport(C);

    defaultMethods(C, {

        /**
         * Model instance which this component is rendering.
         *
         * Applications can specify this by setting it either as a field directly on the component class definition
         * or as a prop specifed by a parent Component.   If specified as a prop, it can be specified as either an actual
         * model instance, or a config for one to be created of type 'modelClass'.
         *
         * Parent components should provide concrete instances of models to their children only if they wish to
         * programmatically access those models to reference data, or manipulate the component.  Otherwise the models
         * should be created 'locally' either in the class definition, or via the config object.  When created
         * 'locally', models are assumed to be owned by this component and will also be destroyed when the
         * component itself is unmounted and destroyed.
         *
         * The model object is not expected to change for the lifetime of the component.  Applications that wish to
         * change the model for a mounted component should ensure that a new instance of the component gets mounted --
         * this can be done easily by setting the component's key prop to model.xhId().
         */
        model: {
            get() {

                // _localModel = owned by this object, _propsModel = provided by props as instantiated model

                // Get previously seen/configured
                const {_localModel, _propsModel, props} = this;
                if (_localModel) return _localModel;
                if (_propsModel) {
                    if (_propsModel !== props.model) this.throwModelChangeException();
                    return this._propsModel;
                }

                // ..or gather from props, potentially instantiating new model if needed.
                const {model}  = this.props;
                if (isPlainObject(model) && C.modelClass) {
                    return this._localModel = new C.modelClass(model);
                }
                return this._propsModel = model;
            },

            set(value) {
                if (this._propsModel || this._localModel) this.throwModelChangeException();
                this._localModel = value;
            }
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
         *  Does this component contain a particular element.
         */
        containsElement(elem) {
            for (let thisElem = this.getDOMNode(); elem; elem = elem.parentElement) {
                if (elem == thisElem) return true;
            }
            return false;
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
            XH.safeDestroy(this._localModel);
        }
    });

    defaultMethods(C, {
        throwModelChangeException() {
            throw XH.exception(
                'Cannot re-render Component with a different model.  If you wish to do ' +
                'this, ensure the Component gets re-mounted by rendering it with a unique "key", e.g. ' +
                '"key: model.xhId()"'
            );
        }
    });

    // This must be last, should provide the last override of render
    C = observer(C);
    
    return C;
}