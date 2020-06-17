/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {clamp, throttle} from 'lodash';

@HoistModel
export class DraggerModel {

    ref = createObservableRef();

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
        this.throttledSetSize = throttle(size => panelModel.setSize(size), 50);

        // Add listeners to el to ensure we can get non-passive handlers than can preventDefault()
        // React synthetic touch events on certain browsers (e.g. airwatch) don't yield that
        this.addReaction({
            track: () => this.ref.current,
            run: (current) => {
                if (current) this.addListeners(current);
            }
        });
    }

    addListeners(el) {
        if (XH.isDesktop) {
            el.addEventListener('dragstart', this.onDragStart);
            el.addEventListener('drag', this.onDrag);
            el.addEventListener('dragend', this.onDragEnd);
        } else {
            el.addEventListener('touchstart', this.onDragStart);
            el.addEventListener('touchmove', this.onDrag, {passive: false});
            el.addEventListener('touchend', this.onDragEnd);
        }
    }

    onDragStart = (e) => {
        const dragger = e.target;
        this.panelEl = dragger.parentElement;
        const {panelEl: panel, panelModel} = this,
            {resizeWhileDragging, sizedInPercents, maxSize, vertical} = panelModel;

        throwIf(
            !panel.nextElementSibling && !panel.previousElementSibling,
            'Resizable panel has no sibling panel against which to resize.'
        );

        e.stopPropagation();

        const {clientX, clientY} = this.parseEventPositions(e);
        this.resizeState = {startX: clientX, startY: clientY};
        this.startSize = sizedInPercents ? panel[vertical ? 'offsetHeight' : 'offsetWidth'] : panelModel.size;
        this.panelParent = panel.parentElement;
        panelModel.setIsResizing(true);

        if (!resizeWhileDragging) {
            this.dragBar = this.getDraggableSplitter(dragger);
            this.panelParent.appendChild(this.dragBar);
            this.diff = 0;
        }

        // We will use whichever is smaller - the calculated available size, or the configured max size
        const calcMaxSize = this.startSize + this.getSiblingAvailSize();
        this.maxSize = maxSize ? Math.min(this.forcePx(maxSize), calcMaxSize) : calcMaxSize;
    };

    onDrag = (e) => {
        if (!this.resizeState) return;

        e.preventDefault();
        e.stopPropagation();

        if (!this.isValidMouseEvent(e) && !this.isValidTouchEvent(e)) {
            this.onDragEnd();
            return;
        }

        const {screenX, screenY, clientX, clientY} = this.parseEventPositions(e);
        // Skip degenerate final drag event from dropping over non-target
        if (screenX === 0 && screenY === 0 && clientX === 0 && clientY === 0) {
            return;
        }

        const {side, resizeWhileDragging} = this.panelModel,
            {startX, startY} = this.resizeState;

        switch (side) {
            case 'left':    this.diff = clientX - startX; break;
            case 'right':   this.diff = startX - clientX; break;
            case 'bottom':  this.diff = startY - clientY; break;
            case 'top':     this.diff = clientY - startY; break;
        }

        if (resizeWhileDragging) {
            this.updateSize(true);
        } else {
            this.moveDragBar();
        }
    };

    onDragEnd = () => {
        const {panelModel} = this;
        if (!panelModel.isResizing) return;

        panelModel.setIsResizing(false);

        if (!panelModel.resizeWhileDragging) {
            this.updateSize();
            this.panelParent.removeChild(this.dragBar);
        }

        this.resizeState = null;
        this.startSize = null;
        this.maxSize = null;
        this.diff = null;
        this.panelEl = null;
        this.panelParent = null;
        this.dragBar = null;
    };

    updateSize(throttle) {
        const {minSize, sizedInPercents} = this.panelModel,
            {startSize} = this;

        if (startSize !== null) {
            let size = clamp(startSize + this.diff, this.forcePx(minSize), this.maxSize);
            size = sizedInPercents ? this.toPct(size) : size;
            if (throttle) {
                this.throttledSetSize(size);
            } else {
                this.panelModel.setSize(size);
            }
        }
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
            {side} = panelModel,
            minSize = this.forcePx(panelModel.minSize);

        if (!dragBar) return;

        const stl = dragBar.style;
        stl.display = 'block';

        if (diff + startSize <= minSize) { // constrain to minSize (which could be 0)
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

    parseEventPositions(e) {
        const {screenX, screenY, clientX, clientY} = this.isValidTouchEvent(e) ? e.touches[0] : e;
        return {screenX, screenY, clientX, clientY};
    }

    isValidMouseEvent(e) {
        return e.buttons && e.buttons !== 0;
    }

    isValidTouchEvent(e) {
        return e.touches && e.touches.length > 0;
    }

    forcePx(val) {
        const PM = this.panelModel;
        if (!PM.isPercent(val)) return val;
        return parseFloat(val) * this.panelParent[PM.vertical ? 'offsetHeight' : 'offsetWidth'] / 100;
    }

    toPct(val) {
        const dragBarWidth = '8', // in px
            parentSize = this.panelParent[this.panelModel.vertical ? 'offsetHeight' : 'offsetWidth'],
            minPct = dragBarWidth / parentSize * 100,
            ret = Math.max(minPct, val / parentSize * 100);
        return ret + '%';
    }
}
