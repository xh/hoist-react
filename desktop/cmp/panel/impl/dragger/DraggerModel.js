/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';


@HoistModel
export class DraggerModel {

    panelModel;
    resizeState = null;
    startSize = null;
    diff = null;
    panelEl = null;
    panelParent = null;
    dragBar = null;
    maxSize = null;

    constructor(panelModel) {
        this.panelModel = panelModel;
    }

    onDragStart = (e) => {
        const dragger = e.target;
        this.panelEl = dragger.parentElement;
        const {panelEl: panel} = this;

        throwIf(
            !panel.nextElementSibling && !panel.previousElementSibling,
            'Resizable panel has no sibbling panel against which to resize.'
        );

        this.resizeState = {startX: e.clientX, startY: e.clientY};
        this.startSize = this.panelModel.size;
        this.panelParent = panel.parentElement;
        this.panelModel.setIsResizing(true);
        this.dragBar = this.getDraggableSplitter(dragger);
        this.panelParent.appendChild(this.dragBar);
        this.diff = 0;
        this.maxSize = this.startSize + this.getSiblingAvailSize();
        e.stopPropagation();
    }

    onDrag = (e) => {
        if (!this.resizeState) return;
        if (!e.buttons || e.buttons.length == 0) {
            this.onDragEnd();
            return;
        }

        const {side} = this.panelModel,
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

        this.moveDragBar();
    }

    onDragEnd = () => {
        const {panelModel} = this;
        if (!panelModel.isResizing) return;

        const size = Math.min(this.maxSize, Math.max(panelModel.minSize, this.startSize + this.diff));

        panelModel.setSize(size);
        panelModel.setIsResizing(false);

        this.panelParent.removeChild(this.dragBar);
        this.resizeState = null;
        this.startSize = null;
        this.maxSize = null;
        this.diff = null;
        this.panelEl = null;
        this.panelParent = null;
        this.dragBar = null;
    }

    getDraggableSplitter() {
        // clone .xh-resizable-splitter to get its styling
        const splitter = this.panelEl.querySelector('.xh-resizable-splitter'),
            ret = splitter.cloneNode();

        ret.style.position = 'absolute';
        ret.style.display = 'none'; // display = none needed to prevent flash
        ret.classList.add('xh-resizable-dragger-visible');

        return ret;
    }

    moveDragBar() {
        const {diff, dragBar, maxSize, panelModel, panelEl: panel, startSize} = this,
            {side, minSize} = panelModel;
        if (!dragBar) return;

        const stl = dragBar.style;
        stl.display = 'block';

        if (diff + startSize <= minSize) {               // constrain to minSize (which could be 0)
            switch (side) {
                case 'left':    stl.left =  (panel.offsetLeft + minSize) + 'px'; break;
                case 'top':     stl.top =   (panel.offsetTop + minSize) + 'px'; break;
                case 'right':   stl.left =  (panel.offsetLeft + startSize - minSize) + 'px'; break;
                case 'bottom':  stl.top =   (panel.offsetTop + startSize - minSize) + 'px'; break;
            }
        } else if (diff + startSize >= maxSize) {  // constrain to max-size
            switch (side) {
                case 'left':    stl.left =  (panel.offsetLeft + maxSize) + 'px'; break;
                case 'top':     stl.top =   (panel.offsetTop + maxSize) + 'px'; break;
                case 'right':   stl.left =  (panel.offsetLeft + startSize - maxSize) + 'px'; break;
                case 'bottom':  stl.top =   (panel.offsetTop + startSize - maxSize) + 'px'; break;
            }
        } else {
            switch (side) {
                case 'left':    stl.left =  (panel.offsetLeft + startSize + diff) + 'px'; break;
                case 'top':     stl.top =   (panel.offsetTop + startSize + diff) + 'px'; break;
                case 'right':   stl.left =  (panel.offsetLeft - diff) + 'px'; break;
                case 'bottom':  stl.top =   (panel.offsetTop - diff) + 'px'; break;
            }
        }
    }

    getSiblingAvailSize() {
        const {panelModel, panelEl} = this,
            sib = panelModel.contentFirst ? panelEl.nextElementSibling : panelEl.previousElementSibling,
            sibIsResizable = sib.classList.contains('xh-resizable'),
            sibSplitter = sibIsResizable ? sib.querySelector('.xh-resizable-splitter') : null;

        // Use 'clientWidth/Height', not 'offsetWidth/Height' here, because clientHeight does not count borders.
        // Flexbox does not collapse borders when resizing.
        return panelModel.vertical ?
            sib.clientHeight - (sibIsResizable ? sibSplitter.offsetHeight : 0):
            sib.clientWidth - (sibIsResizable ? sibSplitter.offsetWidth : 0);
    }
}
