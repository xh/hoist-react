/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {elemFactory, ManagedSupport, ReactiveSupport, XH, XhIdSupport} from '@xh/hoist/core';
import classNames from 'classnames';
import {isPlainObject, isUndefined} from 'lodash';
import {Component, useDebugValue} from 'react';
import ReactDom from 'react-dom';
import {useOwnedModelLinker} from './impl/UseOwnedModelLinker';
import {observer} from '@xh/hoist/mobx';
import {ModelLookupContext} from './impl/ModelLookup';


/**
 * Hoist base class for components. Adds support for MobX reactivity, resource management, model
 * awareness, and other convenience methods below.
 *
 * NOTE: This class provided the original method for specifying class-based components within
 * Hoist React, and is maintained to support legacy applications and any exceptional cases where
 * a class-based component continues to be necessary or preferred.
 *
 * Developers are encouraged to {@see hoistComponent} for a functional, hooks-compatible approach
 * to defining components within Hoist apps.
 */
@observer
@ManagedSupport
@ReactiveSupport
@XhIdSupport
export class HoistComponent extends Component {

    static contextType = ModelLookupContext;

    get isHoistComponent() {return true}

    constructor(props) {
        super(props);
    }

    /**
     * The primary backing Model instance for this component.
     *
     * This property provides a Class-based component with functionality similar to that
     * provided to functional components by their 'model' config and the `useModel()` hook.
     *
     * Set the static 'modelClass' property to specify the type of its primary model. This
     * validates any provided model and allows the component to auto-create a model of the
     * required type when provided with a plain config object via props.
     *
     * Specify an internally created model by creating an instance of the model class and
     * setting it as a field directly on the Component class definition.
     *
     * Specify an external model by providing an instance of a HoistModel in `props.model`
     * or by providing it via context.
     *
     * Local models or models provided as a plain-object config (and therefore created
     * on-demand) will have their lifecycle bound to that of the Component itself - i.e.
     * they will be destroyed when the Component is unmounted and destroyed.
     *
     * External models provided as concrete instances (via props or context) are assumed to
     * be owned / managed by an ancestor Component and will *not* be auto-destroyed when
     * this component is unmounted.
     *
     * The model instance is not expected to change for the lifetime of the component. Apps
     * that wish to swap out the model for a mounted component should ensure that a new
     * instance of the component gets mounted. This can be done by setting the component's
     * `key` prop to `model.xhId`, as HoistModels always return IDs unique to each instance.
     *
     * @see HoistModel
     */
    get model() {
        const {_model, props} = this;

        // 1) Return any model instance that has already been processed / set on the Component.
        if (!isUndefined(_model)) return _model;

        // 2) Otherwise we will source, validate, and memoize as appropriate.
        const {modelClass} = this,
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
        if (!propsModel) {
            const modelLookup = this.context;
            if (modelLookup) {
                ret = modelLookup.lookupModel(modelClass);
            }
        }

        // 2c) Validate and return
        if (ret && modelClass && !(ret instanceof modelClass)) throwWrongModelClass(modelClass);
        return this._model = ret;
    }

    set model(value) {
        if (this._model) throwModelChangeException();
        this._model = value;
        this._modelIsOwned = true;
    }

    /**
     * Is this component in the DOM and not within a hidden sub-tree (e.g. hidden tab)?
     * Based on the underlying css 'display' property of all ancestor properties.
     */
    get isDisplayed() {
        let elem = this.getDOMNode();
        if (!elem) return false;
        while (elem) {
            if (elem.style.display === 'none') return false;
            elem = elem.parentElement;
        }
        return true;
    }

    /**
     *  Does this component contain a particular element?
     */
    containsElement(elem) {
        for (let thisElem = this.getDOMNode(); elem; elem = elem.parentElement) {
            if (elem === thisElem) return true;
        }
        return false;
    }

    /**
     * Get the DOM element underlying this component, or null if component is not mounted.
     */
    getDOMNode() {
        return this._mounted ? ReactDom.findDOMNode(this) : null;
    }

    /**
     * Concatenate a CSS baseClassName (as defined on component) with any instance-specific
     * className provided via props and optional extra names provided at render-time.
     *
     * @param {...string} [extraNames] - additional optional classNames to append.
     *
     */
    getClassName(...extraNames) {
        return classNames(
            this.baseClassName,
            this.props.className,
            ...extraNames
        );
    }

    componentDidMount() {
        super.componentDidMount();
        this._mounted = true;
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        this._mounted = false;
        this.destroy();
    }

    render() {
        const element = super.render();
        return this._modelIsOwned ? modelHost({model: this.model, element}) : element;
    }
}
HoistComponent.isHoistComponent = true;


//------------------------
// Implementation
//------------------------
function throwModelChangeException() {
    throw XH.exception(`
        Cannot re-render Component with a different model. If a new model is required, ensure
        the Component is re-mounted by rendering it with a unique key, e.g. "key: model.xhId".
    `);
}

function throwWrongModelClass(modelClass) {
    throw XH.exception(`Component requires model of type ${modelClass.name}.`);
}

function warnNoModelClassProvided() {
    console.warn('Component class definition must set the static modelClass property to support creating models from prop objects.');
}

function ModelHost({model, element}) {
    useDebugValue(model, m => m.constructor.name + ' (owned)');
    useOwnedModelLinker(model);
    return element;
}

const modelHost = elemFactory(ModelHost);