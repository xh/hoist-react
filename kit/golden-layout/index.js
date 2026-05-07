/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import GoldenLayout from './impl/js/index.js';
import './impl/css/goldenlayout-base.css';
import './impl/css/goldenlayout-light-theme.css';
import React from 'react';
import ReactDOM from 'react-dom';
import {createRoot} from 'react-dom/client';
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

    // Keep reference to the root for unmounting.
    _root = null;

    // Remove wiring up `componentWillUpdate` and `setState`. These methods don't work
    // with functional components.
    _render() {
        this._reactComponent = this._getReactComponent();
        if (!this._root) this._root = createRoot(this._container.getElement()[0]);
        this._root.render(this._reactComponent);
    }

    // Unmount the root rather than use outdated `ReactDOM.unmountComponentAtNode`
    _destroy() {
        this._root.unmount();
        this._container.off('open', this._render, this);
        this._container.off('destroy', this._destroy, this);
    }

    // Modify this to pass viewModelId through.
    // Also ensures any state is provided to the DashContainerView via props.
    // This enables us to associate DashViewModels with GoldenLayout react component instances.
    _getReactComponent() {
        const {icon, title, state, viewModelId} = this._container._config;
        const props = {
            viewModelId,
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

// When creating drop zones in the root component, GoldenLayout (v1.5.9) assumes
// that the root component is full screen (i.e. the origin is 0,0).
//
// That means that if a dashboard is not positioned at or near 0,0 in the document,
// the left and top root drag areas do not work.
//
// The below patch fixes this by adding in the current x and y offset to the root
// areas when appropriate.
//
// See https://github.com/golden-layout/golden-layout/issues/459
// See https://github.com/golden-layout/golden-layout/pull/457
GoldenLayout['__lm'].LayoutManager.prototype._$createRootItemAreas = function() {
    const sides = {y2: 'y1', x2: 'x1', y1: 'y2', x1: 'x2'},
        areaSize = 50;

    for (const side in sides) {
        const area = this.root._$getArea();
        area.side = side;
        if (sides[side][1] === '2') {
            area[side] = area[sides[side]] - areaSize;
        } else {
            area[side] = area[sides[side]] + areaSize;
        }
        area.surface = (area.x2 - area.x1) * (area.y2 - area.y1);
        this._itemAreas.push(area);
    }
};

export {GoldenLayout};
