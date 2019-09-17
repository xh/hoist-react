/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistCmp, HoistModel, useLocalModel} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';

import './Dragger.scss';

export const dragger = hoistCmp.factory({
    displayName: 'Dragger',
    model: false,

    render({model}) {
        const dragModel = useLocalModel(() => new DragModel(model));

        return div({
            className: `xh-resizable-dragger ${model.side}`,
            onDrag: dragModel.onDrag,
            onDragStart: dragModel.onDragStart,
            onDragEnd: dragModel.onDragEnd,
            draggable: true
        });
    }
});

@HoistModel
class DragModel {

    model;
    resizeState = null;
    startSize = null;
    diff = null;
    panel = null;
    panelParent = null;

    constructor(model) {
        this.model = model;
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

    onDragEnd = () => {
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
        const splitter = this.getSibling(e.target, 'previous', 'xh-resizable-splitter');
        if (!splitter) return;

        const clone = splitter.cloneNode();

        // set position=absolute here
        // to overide whatever may be in splitter inline styles
        clone.style.position = 'absolute';

        // display = none needed to prevent flash of new bar
        // even though its css already has display: none
        clone.style.display = 'none';

        clone.classList.add('xh-resizable-dragger-visible');
        this.panelParent.appendChild(clone);
    }

    moveSplitterBar() {
        const {diff, model, panel, panelParent, startSize} = this,
            bar = panelParent.querySelector('.xh-resizable-dragger-visible');
        if (!bar) return;

        const stl = bar.style;

        let maxSize = this.solveMaxSize();
        if (diff + startSize <= 0) {               // min-size
            switch (model.side) {
                case 'left':    stl.left = panel.offsetLeft + 'px'; break;
                case 'right':   stl.left = (panel.offsetLeft + startSize) + 'px'; break;
                case 'bottom':  stl.top = (panel.offsetTop + startSize) + 'px'; break;
                case 'top':     stl.top = panel.offsetTop + 'px'; break;
            }
        } else if (diff + startSize >= maxSize) {  // max-size
            switch (model.side) {
                case 'left':    stl.left = (panel.offsetLeft + maxSize) + 'px'; break;
                case 'right':   stl.left = (panel.offsetLeft + startSize - maxSize) + 'px'; break;
                case 'bottom':  stl.top = (panel.offsetTop + startSize - maxSize) + 'px'; break;
                case 'top':     stl.top = (panel.offsetTop + maxSize) + 'px'; break;
            }
        } else {
            switch (model.side) {
                case 'left':    stl.left = (panel.offsetLeft + startSize + diff) + 'px'; break;
                case 'right':   stl.left = (panel.offsetLeft - diff) + 'px'; break;
                case 'bottom':  stl.top = (panel.offsetTop - diff) + 'px'; break;
                case 'top':     stl.top = (panel.offsetTop + startSize + diff - bar.offsetHeight) + 'px'; break;
            }
        }
        stl.display = 'block';
    }

    solveMaxSize() {
        const {model, panel, startSize} = this,
            prevSib = panel.previousElementSibling,
            nextSib = panel.nextElementSibling;
            // Use 'clientWidth/Height', not 'offsetWidth/Height' here, because clientHeight does not count borders.
            // Flexbox does not collapse borders when resizing.
        switch (model.side) {
            case 'left':    return startSize + nextSib.clientWidth - this.getDragBarDim();
            case 'right':   return startSize + prevSib.clientWidth - this.getDragBarDim();
            case 'bottom':  return startSize + prevSib.clientHeight - this.getDragBarDim();
            case 'top':     return startSize + nextSib.clientHeight - this.getDragBarDim();
        }
    }

    getDragBarDim() {
        const {model, panel} = this,
            prevSib = panel.previousElementSibling,
            nextSib = panel.nextElementSibling;

        switch (model.side) {
            case 'left':    return nextSib.classList.contains('xh-resizable') ? nextSib.querySelector('.xh-resizable-splitter').offsetWidth : 0;
            case 'right':   return prevSib.classList.contains('xh-resizable') ? prevSib.querySelector('.xh-resizable-splitter').offsetWidth : 0;
            case 'bottom':  return prevSib.classList.contains('xh-resizable') ? prevSib.querySelector('.xh-resizable-splitter').offsetHeight : 0;
            case 'top':     return nextSib.classList.contains('xh-resizable') ? nextSib.querySelector('.xh-resizable-splitter').offsetHeight : 0;
        }
    }

    getSibling(item, dir, className) {
        const method = dir + 'ElementSibling';
        let ret = item[method];
        while (ret && !ret.classList.contains(className)) {
            ret = ret[method];
        }
        return ret;
    }
}
