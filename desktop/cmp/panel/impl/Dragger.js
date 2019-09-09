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
    panel = null;
    panelParent = null;

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
        this.panel = e.target.parentElement;
        this.panelParent = this.panel.parentElement;
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

        this.moveSplitterBar();
    }

    onDragEnd = (e) => {
        if (this.diff === null) return;

        const size = this.solveNewSize();

        this.model.setSize(size);
        this.resizeState = null;
        this.startSize = null;
        this.diff = null;
        this.panel = null;
        this.panelParent = null;
        this.model.setIsResizing(false);

        const clone = document.querySelector('.xh-resizable-dragger-visible');
        clone.parentElement.removeChild(clone);
    }

    solveNewSize() {
        return Math.min(this.solveMaxSize(), Math.max(0, this.startSize + this.diff));
    }

    insertDraggableSplitter(e) {
        // clone .xh-resizable-splitter to get its styling
        const splitter = this.getSibling(e.target, 'previous', 'xh-resizable-splitter'),
            clone = splitter.cloneNode();

        // set position=absolute here
        // to overide whatever may be in splitter inline styles
        clone.style.position = 'absolute';
        clone.classList.add('xh-resizable-dragger-visible');
        this.panelParent.appendChild(clone);
    }

    moveSplitterBar() {
        const {diff, model, panel, panelParent} = this,
            bar = panelParent.querySelector('.xh-resizable-dragger-visible'),
            stl = bar.style;

        let maxSize = this.solveMaxSize();

        switch (model.side) {
            case 'left':
                if (diff + this.startSize <= 0) {                       // min-size
                    stl.left = panel.offsetLeft + 'px';
                } else if (diff + this.startSize >= maxSize) {          // max-size
                    stl.left = maxSize + 'px';
                } else {
                    stl.left = (panel.offsetWidth + diff) + 'px';
                }
                break;
            case 'right':
                if (diff + this.startSize <= 0) {                       // min-size
                    stl.left = (panel.offsetLeft + this.startSize) + 'px';
                } else if (diff + this.startSize >= maxSize) {          // max-size
                    stl.left = (panelParent.offsetWidth - maxSize - bar.offsetWidth) + 'px';
                } else {
                    stl.left = (panel.offsetLeft  - diff) + 'px';
                }
                break;
            case 'bottom':
                if (diff + this.startSize <= 0) {                       // min-size
                    stl.top = (panel.offsetTop + this.startSize) + 'px';
                } else if (diff + this.startSize >= maxSize) {          // max-size
                    stl.top = (panelParent.offsetHeight - maxSize - bar.offsetHeight) + 'px';
                } else {
                    stl.top = (panel.offsetTop - diff) + 'px';
                }
                break;
            case 'top':
                if (diff + this.startSize <= 0) {                       // min-size
                    stl.top = panel.offsetTop + 'px';
                } else if (diff + this.startSize >= maxSize) {         // max-size
                    stl.top = (maxSize) + 'px';
                } else {
                    stl.top = (panel.offsetHeight + diff - bar.offsetHeight) + 'px';
                }
                break;
        }

        stl.display = 'block';
    }

    solveMaxSize() {
        const {model, panel, panelParent, startSize} = this,
            prevSib = panel.previousElementSibling,
            nextSib = panel.nextElementSibling;

        switch (model.side) {
            case 'left':    return nextSib ? startSize + nextSib.offsetWidth : panelParent.offsetWidth;
            case 'right':   return prevSib ? startSize + prevSib.offsetWidth : panelParent.offsetWidth;
            case 'bottom':  return prevSib ? startSize + prevSib.offsetHeight -1 : panelParent.offsetHeight;
            case 'top':     return nextSib ? startSize + nextSib.offsetHeight - 1 : panelParent.offsetHeight;
        }
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