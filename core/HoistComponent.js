/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import ReactDom from 'react-dom';
import React from 'react';
import {XH, elemFactory, useLoadSupportLinker} from '@xh/hoist/core';
import {observer} from '@xh/hoist/mobx';
import {isPlainObject, isFunction} from 'lodash';
import {applyMixin} from '@xh/hoist/utils/js';
import {getClassName} from '@xh/hoist/utils/react';
import {ReactiveSupport, XhIdSupport, ManagedSupport} from './mixins';


/**
 * Core Hoist utility for defining a React functional component.
 *
 * This function always applies the MobX 'observer' behavior to the new component, enabling MobX
 * powered reactivity and auto-re-rendering. See the hooks package for additional Hoist-provided
 * custom hooks that can (and should!) be used within function components to replicate the most
 * essential / relevant capabilities of the class-based HoistComponent decorator
 *
 * This function also automatically applies React.forwardRef to the passed render function, if needed,
 * to create support for references.  If the function input contains two arguments, it is assumed to
 * support forward references.
 *
 * @param {Object|function} config - configuration object or function defining the component
 * @param {function} [config.render] - function defining the component (if config object specified)
 * @param {string} [config.displayName] - name of function for debugging/inspection purposes (if config object specified)
 *
 * @see HoistComponent decorator for a class-based approach to defining a Component in Hoist.
 */
export function hoistComponent(config) {
    if (isFunction(config)) config = {render: config};

    let {render, displayName} = config;

    const hasRef = render.length >= 2,
        component = observer(hasRef ? React.forwardRef(render) : render);

    if (displayName) component.displayName = displayName;

    return component;
}

export function hoistComponentFactory(config) {
    return elemFactory(hoistComponent(config));
}


/**
 * Create a Class Component in Hoist.
 *
 * Adds support for MobX reactivity, model awareness, and other convenience methods below.
 *
 * NOTE: This decorator provided the original method for specifying class-based components within
 * Hoist React, and is maintained to support legacy applications and any exceptional cases where
 * a class-based component continues to be necessary or preferred.
 *
 * Developers are encouraged to @see hoistComponent above for a functional, hooks-compatible
 * approach to component definition for Hoist apps.
 */
export function HoistComponent(C) {
    return applyMixin(C, {
        name: 'HoistComponent',
        includes: [observer, ManagedSupport, ReactiveSupport, XhIdSupport],

        defaults: {
            /**
             * Model instance which this component is rendering.
             *
             * Applications specify a Component's model by either setting it as a field directly on
             * the Component class definition or by passing it as a prop from a parent Component.
             * If provided as a prop, the model can be passed as either an already-created class
             * instance or as a config for one to be created internally. A Component class
             * definition should include a static `modelClass` field to support this latter
             * create-on-demand pattern.
             *
             * Parent components should provide concrete instances of models to their children only
             * if they wish to programmatically access those models to reference data or otherwise
             * manipulate the component using the model's API. Otherwise, models can and should be
             * created internally by the Component, either in the class definition or via a config
             * object prop.
             *
             * Models that are created internally by the component may be considered "owned" models.
             * They will be destroyed when the component is unmounted (via destroy()).
             *
             * When concrete instances are provided via props they are assumed to be owned / managed
             * by a parent Component. Otherwise models are considered to be "locally owned" by the
             * Component itself and will be destroyed when the Component is unmounted and destroyed.
             *
             * The model instance is not expected to change for the lifetime of the component. Apps
             * that wish to swap out the model for a mounted component should ensure that a new
             * instance of the component gets mounted. This can be done by setting the component's
             * `key` prop to `model.xhId`, as HoistModels always return IDs unique to each instance.
             *
             * @see HoistModel
             */
            model: {
                get() {
                    const {_model, _modelIsOwned, props} = this;

                    // Return any model instance that has already been processed / set on the Component.
                    if (_model) {
                        if (!_modelIsOwned && props.model !== _model) throwModelChangeException();
                        return _model;
                    }

                    // ...or source from props, potentially instantiating if appropriate.
                    const {modelClass} = C,
                        propsModel = props.model;

                    if (propsModel) {
                        if (isPlainObject(propsModel)) {
                            if (modelClass) {
                                this._model = new modelClass(propsModel);
                                this._modelIsOwned = true;
                            } else {
                                warnNoModelClassProvided();
                            }
                        } else {
                            if (modelClass && !(propsModel instanceof modelClass)) throwWrongModelClass(this);
                            this._model = propsModel;
                            this._modelIsOwned = false;
                        }
                    }

                    // ...and return whatever was (or not) created
                    return this._model;
                },

                set(value) {
                    if (this._model) throwModelChangeException();
                    this._model = value;
                    this._modelIsOwned = true;
                }
            },

            ownedModel: {
                get() {
                    const {model, _modelIsOwned} = this;
                    return model && _modelIsOwned ? model : null;
                }
            },

            /**
             * Is this component in the DOM and not within a hidden sub-tree (e.g. hidden tab)?
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
             *  Does this component contain a particular element?
             */
            containsElement(elem) {
                for (let thisElem = this.getDOMNode(); elem; elem = elem.parentElement) {
                    if (elem == thisElem) return true;
                }
                return false;
            },

            /**
             * Get the DOM element underlying this component, or null if component is not mounted.
             */
            getDOMNode() {
                return this._mounted ? ReactDom.findDOMNode(this) : null;
            },

            /**
             * Concatenate a CSS baseClassName (as defined on component) with any instance-specific
             * className provided via props and optional extra names provided at render-time.
             *
             * @param {...string} [extraNames] - additional optional classNames to append.
             *
             * This method delegates to the utility function {@link getClassName}.  See that method
             * for more information.
             */
            getClassName(...extraNames) {
                return getClassName(
                    this.baseClassName,
                    this.props,
                    ...extraNames
                );
            }
        },


        chains: {
            componentDidMount() {
                this._mounted = true;
            },

            componentWillUnmount() {
                this._mounted = false;
                this.destroy();
            },

            destroy() {
                if (this._modelIsOwned) {
                    XH.safeDestroy(this._model);
                }
            }
        },


        overrides: {
            render: (sup) => {
                return function() {
                    const {ownedModel} = this,
                        renderFn = sup.bind(this);

                    return (ownedModel && ownedModel.isLoadSupport) ?
                        loadSupportWrapper({renderFn, loadSupport: ownedModel}) :
                        renderFn();
                };
            }
        }
    });
}


//-------------------------------
// Implementation
//--------------------------------
function throwModelChangeException() {
    throw XH.exception(`
                Cannot re-render Component with a different model. If a new model is required, ensure 
                the Component is re-mounted by rendering it with a unique key, e.g. "key: model.xhId".
            `);
}

function throwWrongModelClass(obj) {
    throw XH.exception(`Component requires model of type ${obj.modelClass.constructor}.`);
}

function warnNoModelClassProvided() {
    console.warn('Component class definition must specify a modelClass to support creating models from prop objects.');
}


//---------------------------------------------------------------------------
// Internal components to wrap the contents of a class based @HoistComponent.
//---------------------------------------------------------------------------
const loadSupportWrapper = hoistComponentFactory(
    (props) => {
        useLoadSupportLinker(props.loadSupport);
        return props.renderFn();
    }
);