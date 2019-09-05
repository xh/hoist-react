/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import ReactDom from 'react-dom';
import {XH, elemFactory} from '@xh/hoist/core';
import {isPlainObject, isUndefined} from 'lodash';
import {throwIf, applyMixin} from '@xh/hoist/utils/js';
import {getClassName} from '@xh/hoist/utils/react';
import {ReactiveSupport, XhIdSupport, ManagedSupport} from './mixins';
import {observer} from 'mobx-react';

import {ModelLookupContext} from './impl/ModelLookup';
import {useOwnedModelLinker} from './impl/UseOwnedModelLinker';

/**
 * Create a Class Component in Hoist.
 *
 * Adds support for MobX reactivity, model awareness, and other convenience methods below.
 *
 * NOTE: This decorator provided the original method for specifying class-based components within
 * Hoist React, and is maintained to support legacy applications and any exceptional cases where
 * a class-based component continues to be necessary or preferred.
 *
 * Developers are encouraged to @see hoistComponent for a functional, hooks-compatible
 * approach to component definition for Hoist apps.
 */
export function HoistComponent(C) {

    if (C.supportModelFromContext) applyModelFromContextSupport(C);

    return applyMixin(C, {
        name: 'HoistComponent',
        includes: [observer, ManagedSupport, ReactiveSupport, XhIdSupport],

        defaults: {
            /**
             * Model instance which this component is rendering.
             *
             * This property provides a Class-based component with similar functionality that
             * the 'model' config and useModel() provides a functional component.
             *
             * Specify the static property 'modelClass' on the component to define the type of the model.
             * Specify the static property 'supportModelFromContext' to allow looking up a provided model
             * from context.
             *
             * Specify a 'localModel' by setting it as a field directly on the Component class
             * definition. Specify a 'providedModel' by providing an instance of HoistModel in props.model, or
             * receiving it from context.
             *
             * Provided concrete models are assumed to be owned / managed by a ancestor Component. Local models or models
             * provided as config will be managed by this Component itself and will be destroyed when the Component
             * is unmounted and destroyed.
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

                    // 1) Return any model instance that has already been processed / set on the Component.
                    if (!isUndefined(_model)) {
                        if (!_modelIsOwned && props.model !== _model) throwModelChangeException();
                        return _model;
                    }

                    // 2) Otherwise we will source, validate, and memoize as appropriated
                    const {modelClass} = C,
                        propsModel = props.model;
                    let ret = null;

                    // 2a) Try props, potentially instantiating if appropriate.
                    if (propsModel) {
                        if (isPlainObject(propsModel)) {
                            if (modelClass) {
                                ret = new modelClass(propsModel);
                                this._modelIsOwned = true;
                            } else {
                                warnNoModelClassProvided();
                            }
                        } else {
                            ret = propsModel;
                        }
                    }

                    // 2b) Try context.
                    if (!propsModel && C.supportModelFromContext) {
                        const modelLookup = this.context;
                        if (modelLookup) {
                            return modelLookup.lookup(modelClass);
                        }
                    }

                    // 2c) Validate and return
                    if (modelClass && !(ret instanceof modelClass)) throwWrongModelClass(this);
                    return this._model = ret;
                },

                set(value) {
                    if (this._model) throwModelChangeException();
                    this._model = value;
                    this._modelIsOwned = true;
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
            }
        },


        overrides: {
            render: (sup) => {
                return function() {
                    const element = sup.call(this);
                    return this._modelIsOwned ? modelHost({model: this.model, element}) : element;
                };
            }
        }
    });
}

//-------------------------------
// Implementation
//--------------------------------
function applyModelFromContextSupport(C) {
    throwIf(C.contextClass,
        'Cannot support reading model from context.  Component already defines a contextClass.  Use a functional component instead.'
    );
    C.contextClass = ModelLookupContext;
}


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

function ModelHost({model, element}) {
    useOwnedModelLinker(model);
    return element;
}

const modelHost = elemFactory(ModelHost);