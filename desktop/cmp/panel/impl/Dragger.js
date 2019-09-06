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
import {capitalize} from 'lodash';

import './Dragger.scss';

/** This is an implementation class private to Hoist
 * @private
 */
@HoistComponent
export class Dragger extends Component {

    static modelClass = PanelModel;

    resizeState = null;
    startSize = null;
    diff = null;

    constructor(props) {
        super(props);
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
        this.insertDraggableSplitter(e);
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

        switch (side) {
            case 'left':    this.diff = clientX - startX; break;
            case 'right':   this.diff = startX - clientX; break;
            case 'bottom':  this.diff = startY - clientY; break;
            case 'top':     this.diff = clientY - startY; break;
        }

        this.moveSplitterBar(e);
    }

    onDragEnd = () => {
        console.log('ender');
        if (this.diff === null) return;

        this.model.setSize(this.startSize + this.diff);
        this.resizeState = null;
        this.startSize = null;
        this.diff = null;
        this.model.setIsResizing(false);

        const clone = document.querySelector('.xh-draggable-splitter-bar');
        clone.parentElement.removeChild(clone);

    }

    insertDraggableSplitter(e) {
        const {side} = this.model,
            splitter = this.getSibling(e.target, 'previous', 'xh-resizable-splitter'),
            panel = splitter.parentElement,
            clone = splitter.cloneNode(),
            splitterSide = this.getSplitterSide(),
            stl = clone.style;

        let dim;
        switch (side) {
            case 'left':
            case 'right':   dim = 'height'; break;
            case 'bottom':
            case 'top':     dim = 'width'; break;
        }

        clone.classList.add('xh-draggable-splitter-bar');
        stl.position = 'absolute';
        stl[splitterSide] =  panel['offset' + capitalize(splitterSide)] + 'px';
        stl[dim] = '100%';
        stl.zIndex = 1;
        splitter.parentElement.parentElement.appendChild(clone);
    }

    moveSplitterBar(e) {
        const {side} = this.model,
            panel = e.target.parentElement,
            splitterSide  = this.getSplitterSide(),
            bar = panel.parentElement.querySelector('.xh-draggable-splitter-bar'),
            {diff} = this;

        switch (side) {
            case 'left':     break;
            case 'right':   break;
            case 'bottom':  if ((diff < 0 && diff * -1 > this.startSize) || diff > panel['offset' + capitalize(splitterSide)]) return; break;
            case 'top':     break;
        }

        const stl = bar.style;
        // console.log(bar['offset' + capitalize(splitterSide)], diff);
        stl[splitterSide] = (panel['offset' + capitalize(splitterSide)] + diff * -1) + 'px';
    }

    getSplitterSide() {
        const {side} = this.model;
        let ret;
        switch (side) {
            case 'left':    ret = 'right'; break;
            case 'right':   ret = 'left'; break;
            case 'bottom':  ret = 'top'; break;
            case 'top':     ret = 'bottom'; break;
        }
        return ret;
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