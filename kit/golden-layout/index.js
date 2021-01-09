/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import GoldenLayout from 'golden-layout';
import jquery from 'jquery';
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

// GoldenLayout (v1.5.9) has an issue with touch events, where dragging views on
// a touch device requires 2 touches. This is because the original target of
// the touchstart event is removed. See: https://www.w3.org/TR/touch-events/#the-touchmove-event
//
// Below we patch the DragListener to ensure that the original touch target remains
// until the drag is completed.
const DragListener = GoldenLayout['__lm'].utils.DragListener;
class DragListenerPatched extends DragListener {
    onMouseDown(oEvent) {
        oEvent.preventDefault();

        // PATCH BEGINS
        if (oEvent.type === 'touchstart') {
            this._touchTarget = oEvent.target;

            const parent = this._touchTarget.parentNode,
                idx = Array.from(parent.children).indexOf(this._touchTarget),
                clone = this._touchTarget.cloneNode(true);

            // Add clone of target to parent
            parent.insertBefore(clone, idx < parent.children.length - 1 ? parent.childNodes[idx + 1] : null);

            // Move target to body, and hide
            document.body.appendChild(this._touchTarget);
            this._touchTarget.style.display = 'none';
        }
        // PATCH ENDS

        if (oEvent.button == 0 || oEvent.type === 'touchstart') {
            const coordinates = this._getCoordinates(oEvent);

            this._nOriginalX = coordinates.x;
            this._nOriginalY = coordinates.y;

            this._oDocument.on('mousemove touchmove', this._fMove);
            this._oDocument.one('mouseup touchend', this._fUp);

            this._timeout = setTimeout(GoldenLayout['__lm'].utils.fnBind(this._startDrag, this), this._nDelay);
        }
    }

    onMouseUp(oEvent) {
        // PATCH BEGINS
        if (this._touchTarget) {
            document.body.removeChild(this._touchTarget);
            this._touchTarget = null;
        }
        // PATCH ENDS

        if (this._timeout != null) {
            clearTimeout(this._timeout);
            this._eBody.removeClass('lm_dragging');
            this._eElement.removeClass('lm_dragging');
            this._oDocument.find('iframe').css('pointer-events', '');
            this._oDocument.unbind('mousemove touchmove', this._fMove);
            this._oDocument.unbind('mouseup touchend', this._fUp);

            if (this._bDragging === true) {
                this._bDragging = false;
                this.emit('dragStop', oEvent, this._nOriginalX + this._nX);
            }
        }
    }
}
GoldenLayout['__lm'].utils.DragListener = DragListenerPatched;

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

// Overwrite jquery's 'touchmove' handler wiring, to ensure 'touchmove' handlers are non-passive.
// This is required to suppress an error thrown by trying to preventDefault() a passive event.
jquery.event.special.touchmove = {
    setup: function(_, ns, handle) {
        this.addEventListener('touchmove', handle, {passive: false});
    }
};

export {GoldenLayout};