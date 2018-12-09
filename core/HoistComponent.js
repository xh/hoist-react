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

import {ReactiveSupport, XhIdSupport} from './mixins';

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
    C = XhIdSupport(C);

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
         * can be specified internally, either in the class definition, or via a prop which is a simple object,
         * representing the model to be created.
         *
         * When concrete instances are  provided via props, they are assumed to be managed by a parent component.
         * Otherwise models are assumed to be owned by this component and will be destroyed when the
         * component itself is unmounted and destroyed.
         *
         * The model object is not expected to change for the lifetime of the component.  Applications that wish to
         * change the model for a mounted component should ensure that a new instance of the component gets mounted --
         * this can be done easily by setting the component's key prop to model.xhId.
         */
        model: {
            get() {

                const {_model, _modelWasProvided, props} = this;

                // Return any previously created or seen
                if (_model) {
                    if (_modelWasProvided && props.model !== _model) this.throwModelChangeException();
                    return _model;
                }

                // ..or gather from props, potentially instantiating if appropriate
                const {modelClass} = C,
                    propsModel = props.model;
                if (propsModel) {
                    if (isPlainObject(propsModel)) {
                        if (!modelClass) this.throwNoModelClassProvided();
                        this._model = new modelClass(propsModel);
                    } else {
                        if (modelClass && !(propsModel instanceof modelClass)) this.throwWrongModelClass();
                        this._modelWasProvided = true;
                        this._model = propsModel;
                    }
                    return this._model;
                }

                return null;
            },

            set(value) {
                if (this._model) this.throwModelChangeException();
                this._model = value;
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
            if (!this._modelWasProvided) {
                XH.safeDestroy(this._model);
            }
        }
    });

    defaultMethods(C, {
        throwModelChangeException() {
            throw XH.exception(
                'Cannot re-render Component with a different model.  If you wish to do ' +
                'this, ensure the Component gets re-mounted by rendering it with a unique "key", e.g. ' +
                '"key: model.xhId"'
            );
        },

        throwWrongModelClass() {
            throw XH.exception(`Component requires model of type ${this.constructor.modelClass}.`);
        },

        throwNoModelClassProvided() {
            throw XH.exception('Component requires specification of modelClass in order to create model.');
        }
    });

    // This must be last, should provide the last override of render
    C = observer(C);
    
    return C;
}