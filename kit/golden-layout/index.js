/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import GoldenLayout from 'golden-layout';
import 'golden-layout/src/css/goldenlayout-base.css';
import 'golden-layout/src/css/goldenlayout-light-theme.css';
import {uniqueId} from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import './styles.scss';

// GoldenLayout looks for globally available React and ReactDOM.
window.React = React;
window.ReactDOM = ReactDOM;

// GoldenLayout (v1.5.9) assumes that we will always be using Class Components, and would
// break with functional components.
//
// Below we patch the `_render` and `_getReactComponent` methods of GoldenLayout's
// ReactComponentHandler to work around these limitations.
const ReactComponentHandler = GoldenLayout['__lm'].utils.ReactComponentHandler;
class ReactComponentHandlerPatched extends ReactComponentHandler {

    // Remove wiring up `componentWillUpdate` and `setState`. These methods don't work
    // with functional components.
    _render() {
        this._reactComponent = this._getReactComponent();
        ReactDOM.render(this._reactComponent, this._container.getElement()[0]);
    }

    // Modify this to generate a unique id and pass it through.
    // Also ensures any state is provided to the DashView via props.
    // This enables us to associate DashViewModels with GoldenLayout react component instances.
    _getReactComponent() {
        const {icon, title, state} = this._container._config;
        const props = {
            id: uniqueId('gl-'),
            icon,
            title,
            viewState: state,
            glEventHub: this._container.layoutManager.eventHub,
            glContainer: this._container
        };
        return React.createElement(this._reactClass, props);
    }
}
GoldenLayout['__lm'].utils.ReactComponentHandler = ReactComponentHandlerPatched;

export {GoldenLayout};

