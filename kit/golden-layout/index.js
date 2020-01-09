/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import GoldenLayout from 'golden-layout';

import 'golden-layout/src/css/goldenlayout-base.css';
import 'golden-layout/src/css/goldenlayout-light-theme.css';
import './styles.scss';

// GoldenLayout looks for globally available React and ReactDOM.
// Is there a better way to do this with webpack?
window.React = React;
window.ReactDOM = ReactDOM;

// GoldenLayout (v1.5.9) assumes that ReactDOM.render will return a component - however,
// as of React 16, ReactDOM.render returns null for functional components, which would break.
//
// Below we patch the `_render` method of GoldenLayout's ReactComponentHandler to work
// around this limitation.
const ReactComponentHandler = GoldenLayout['__lm'].utils.ReactComponentHandler;
class ReactComponentHandlerPatched extends ReactComponentHandler {
    _render() {
        this._reactComponent = ReactDOM.render(this._getReactComponent(), this._container.getElement()[0]);

        // PATCH STARTS - Add null check before attempting to wire up component lifecycle methods
        if (!this._reactComponent) return;
        // PATCH ENDS

        this._originalComponentWillUpdate = this._reactComponent.componentWillUpdate || function() {};
        this._reactComponent.componentWillUpdate = this._onUpdate.bind(this);
        if (this._container.getState() && this._reactComponent.setState) {
            this._reactComponent.setState(this._container.getState());
        }
    }
}
GoldenLayout['__lm'].utils.ReactComponentHandler = ReactComponentHandlerPatched;

export {GoldenLayout};

