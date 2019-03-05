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
import {applyMixin} from '@xh/hoist/utils/js';
import classNames from 'classnames';

import {ReactiveSupport, XhIdSupport, ManagedSupport} from './mixins';

import {loadSupportLinker}  from './impl/LoadSupportLinker';

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
    return applyMixin(C, {
        name: 'HoistComponent',
        includes: [observer, ManagedSupport, ReactiveSupport, XhIdSupport],

        defaults: {
            /**
             * Model instance which this component is rendering.
             *
             * Applications specify a Component's model by either setting it as a field directly on the
             * Component class definition or by passing it as a prop from a parent Component. If
             * provided as a prop, the model can be passed as either an already-created class instance
             * or as a config for one to be created internally. A Component class definition should
             * include a static `modelClass` field to support this latter create-on-demand pattern.
             *
             * Parent components should provide concrete instances of models to their children only if
             * they wish to programmatically access those models to reference data or otherwise
             * manipulate the component using the model's API. Otherwise, models can and should be
             * created internally by the Component, either in the class definition or via a config
             * object prop.
             *
             * Models that are created internally by the component may be considered "owned" models.
             * They will be destroyed when the component is unmounted (via destroy()).
             *
             * When concrete instances are provided via props they are assumed to be owned and managed
             * by a parent Component. Otherwise models are considered to be "locally owned" by the
             * Component itself and will be destroyed when the Component is unmounted and destroyed.
             *
             * The model instance is not expected to change for the lifetime of the component. Apps that
             * wish to swap out the model for a mounted component should ensure that a new instance of
             * the component gets mounted. This can be accomplished by setting the component's `key`
             * prop to `model.xhId` (as a model will always return an ID unique to each instance).
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
                    const {ownedModel} = this;
                    const renderFn = sup.bind(this);

                    if (ownedModel && ownedModel.isLoadSupport) {
                        return loadSupportLinker({renderFn, model: ownedModel});
                    } else {
                        return renderFn();
                    }
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