/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';
import {PanelModel} from '../PanelModel';
import {throttle} from 'lodash';

import './Dragger.scss';

/** This is an implementation class private to Hoist
 * @private
 */
@HoistComponent
export class Dragger extends Component {

    static modelClass = PanelModel;

    resizeState = null;
    startSize = null;

    constructor(props) {
        super(props);
        this.throttledSetSize = throttle(size => this.model.setSize(size), 50);
    }

    render() {
        const {side} = this.model;
        return div({
            className: `xh-resizable-dragger ${side}`,
            onDrag: this.onDrag,
            onDragStart: this.onDragStart,
            onDragEnd: this.onDragEnd,
            draggable: true
        });
    }

    onDragStart = (e) => {
        this.resizeState = {startX: e.clientX, startY: e.clientY};
        this.startSize = this.model.size;
        this.model.setIsResizing(true);
        // here create copy of splitter for moving
        e.stopPropagation();
    }

    onDrag = (e) => {
        if (!this.resizeState) return;
        if (!e.buttons || e.buttons.length == 0) {
            this.onDragEnd();
            return;
        }

        const {side} = this.model,
            {screenX, screenY, clientX, clientY} = e,
            {startX, startY} = this.resizeState;

        // Skip degenerate final drag event from dropping over non-target
        if (screenX == 0 && screenY === 0 && clientX === 0 && clientY === 0) {
            return;
        }

        let diff;
        switch (side) {
            case 'left':    diff = clientX - startX; break;
            case 'right':   diff = startX - clientX; break;
            case 'bottom':  diff = startY - clientY; break;
            case 'top':     diff = clientY - startY; break;
        }

        this.moveSplitter(e, side, diff);

        if (this.startSize !== null) {
            // this.throttledSetSize(this.startSize + diff);
        }
    }

    onDragEnd = () => {
        this.resizeState = null;
        this.startSize = null;
        this.model.setIsResizing(false);
    }

    moveSplitter(e, side, diff) {
        const splitter = this.getSibling(e.target, 'previous', 'xh-resizable-splitter'),
            // draggableSplitter =
            parent = e.target.parent;

        console.log(parent);
        let dim;
        switch (side) {
            case 'left':
            case 'right':   dim = 'height'; break;
            case 'bottom':
            case 'top':     dim = 'width'; break;
        }

        let splitterSide;
        switch (side) {
            case 'left':    splitterSide = 'right'; break;
            case 'right':   splitterSide = 'left'; break;
            case 'bottom':  splitterSide = 'top'; break;
            case 'top':     splitterSide = 'bottom'; break;
        }

        switch (side) {
            case 'left':    splitterSide = 'right'; break;
            case 'right':   splitterSide = 'left'; break;
            case 'bottom':  if (diff > 0) return; break;
            case 'top':     splitterSide = 'bottom'; break;
        }
        const stl = splitter.style;
        stl.position = 'absolute';
        stl[splitterSide] = Math.abs(diff) + 'px'; console.log(splitterSide, diff);
        stl[dim] = '100%';
        stl.zIndex = 1;

    }

    getSibling(item, dir, className) {
        const method = dir + 'ElementSibling';
        let ret = item[method];
        while (!ret.classList.contains(className)) {
            ret = ret[method];
        }
        return ret;
    }
}
export const dragger = elemFactory(Dragger);