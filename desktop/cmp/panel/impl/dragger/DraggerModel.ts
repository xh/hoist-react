/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistModel, lookup, XH} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {clamp, throttle} from 'lodash';
import {PanelModel} from '../../PanelModel';

export class DraggerModel extends HoistModel {
    override xhImpl = true;

    @lookup(PanelModel)
    panelModel: PanelModel;

    ref = createObservableRef();

    resizeState = null;
    startSize = null;
    diff = null;
    panelEl = null;
    panelParent = null;
    dragBar = null;
    maxSize = null;
    throttledSetSize;

    override onLinked() {
        this.throttledSetSize = throttle(size => (this.panelModel.size = size), 50);

        // Add listeners to el to ensure we can get non-passive handlers than can preventDefault()
        // React synthetic touch events on certain browsers (e.g. airwatch) don't yield that
        this.addReaction({
            track: () => this.ref.current,
            run: current => {
                if (current) this.addListeners(current);
            }
        });
    }

    private addListeners(el) {
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

    private onDragStart = e => {
        const dragger = e.target;
        this.panelEl = dragger.parentElement;
        const {panelEl: panel, panelModel} = this,
            {vertical} = panelModel;

        throwIf(
            !panel.nextElementSibling && !panel.previousElementSibling,
            'Resizable panel has no sibling panel against which to resize.'
        );

        if (XH.isDesktop) this.setIframePointerEvents('none');

        e.stopPropagation();

        const {clientX, clientY} = this.parseEventPositions(e);
        this.resizeState = {startX: clientX, startY: clientY};
        this.startSize = panel[vertical ? 'offsetHeight' : 'offsetWidth'];
        this.panelParent = panel.parentElement;
        panelModel.setIsResizing(true);

        if (!panelModel.resizeWhileDragging) {
            this.dragBar = this.getDraggableSplitter();
            this.panelParent.appendChild(this.dragBar);
            this.diff = 0;
        }

        // We will use whichever is smaller - the calculated available size, or the configured max size
        const calcMaxSize = this.startSize + this.getSiblingAvailSize();
        this.maxSize = panelModel.maxSize ? Math.min(panelModel.maxSize, calcMaxSize) : calcMaxSize;
    };

    private onDrag = e => {
        if (!this.resizeState) return;

        e.preventDefault();
        e.stopPropagation();

        if (!this.isValidMouseEvent(e) && !this.isValidTouchEvent(e)) {
            this.onDragEnd();
            return;
        }

        const {screenX, screenY, clientX, clientY} = this.parseEventPositions(e);
        // Skip degenerate final drag event from dropping over non-target
        if (screenX === 0 && screenY === 0) {
            return;
        }

        const {side, resizeWhileDragging} = this.panelModel,
            {startX, startY} = this.resizeState;

        switch (side) {
            case 'left':
                this.diff = clientX - startX;
                break;
            case 'right':
                this.diff = startX - clientX;
                break;
            case 'bottom':
                this.diff = startY - clientY;
                break;
            case 'top':
                this.diff = clientY - startY;
                break;
        }

        if (resizeWhileDragging) {
            this.updateSize(true);
        } else {
            this.moveDragBar();
        }
    };

    private onDragEnd = () => {
        if (XH.isDesktop) this.setIframePointerEvents('auto');

        const {panelModel} = this;
        if (!panelModel.isResizing) return;

        panelModel.setIsResizing(false);

        if (!panelModel.resizeWhileDragging) {
            this.updateSize(false);
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

    private updateSize(throttle: boolean) {
        const {minSize} = this.panelModel,
            {startSize} = this;

        if (startSize !== null) {
            const size = clamp(startSize + this.diff, minSize, this.maxSize);
            if (throttle) {
                this.throttledSetSize(size);
            } else {
                this.panelModel.size = size;
            }
        }
    }

    private getDraggableSplitter() {
        // clone .xh-resizable-splitter to get its styling
        const splitter = this.panelModel.splitterRef.current,
            ret = splitter.cloneNode() as HTMLDivElement;

        ret.style.position = 'absolute';
        ret.style.display = 'none'; // display = none needed to prevent flash
        ret.classList.add('xh-resizable-dragger-visible');

        return ret;
    }

    private moveDragBar() {
        const {diff, dragBar, maxSize, panelModel, panelEl: panel, startSize} = this,
            {side, minSize} = panelModel;

        if (!dragBar) return;

        const stl = dragBar.style;
        stl.display = 'block';

        if (diff + startSize <= minSize) {
            // constrain to minSize (which could be 0)
            switch (side) {
                case 'left':
                    stl.left = panel.offsetLeft + minSize + 'px';
                    break;
                case 'top':
                    stl.top = panel.offsetTop + minSize + 'px';
                    break;
                case 'right':
                    stl.left = panel.offsetLeft + startSize - minSize + 'px';
                    break;
                case 'bottom':
                    stl.top = panel.offsetTop + startSize - minSize + 'px';
                    break;
            }
        } else if (diff + startSize >= maxSize) {
            // constrain to max-size
            switch (side) {
                case 'left':
                    stl.left = panel.offsetLeft + maxSize + 'px';
                    break;
                case 'top':
                    stl.top = panel.offsetTop + maxSize + 'px';
                    break;
                case 'right':
                    stl.left = panel.offsetLeft + startSize - maxSize + 'px';
                    break;
                case 'bottom':
                    stl.top = panel.offsetTop + startSize - maxSize + 'px';
                    break;
            }
        } else {
            switch (side) {
                case 'left':
                    stl.left = panel.offsetLeft + startSize + diff + 'px';
                    break;
                case 'top':
                    stl.top = panel.offsetTop + startSize + diff + 'px';
                    break;
                case 'right':
                    stl.left = panel.offsetLeft - diff + 'px';
                    break;
                case 'bottom':
                    stl.top = panel.offsetTop - diff + 'px';
                    break;
            }
        }
    }

    private getSiblingAvailSize() {
        const {panelModel, panelEl} = this,
            sib = panelModel.contentFirst
                ? panelEl.nextElementSibling
                : panelEl.previousElementSibling,
            sibIsResizable = sib.classList.contains('xh-resizable'),
            sibSplitter = sibIsResizable ? sib.querySelector('.xh-resizable-splitter') : null;

        // Use 'clientWidth/Height', not 'offsetWidth/Height' here, because clientHeight does not count borders.
        // Flexbox does not collapse borders when resizing.
        return panelModel.vertical
            ? sib.clientHeight - (sibIsResizable ? sibSplitter.offsetHeight : 0)
            : sib.clientWidth - (sibIsResizable ? sibSplitter.offsetWidth : 0);
    }

    private parseEventPositions(e) {
        const {screenX, screenY, clientX, clientY} = this.isValidTouchEvent(e) ? e.touches[0] : e;
        return {screenX, screenY, clientX, clientY};
    }

    private isValidMouseEvent(e) {
        // Note: We fall back to deprecated 'which' to work around a Safari issue where `buttons`
        // was not being set. We may be able to remove in the future.
        return (e.buttons && e.buttons !== 0) || (e.which && e.which !== 0);
    }

    private isValidTouchEvent(e) {
        return e.touches && e.touches.length > 0;
    }

    /**
     * @param v - Workaround to allow dragging over iframe, which is its own
     *  separate document and cannot listen for events from main document.
     */
    setIframePointerEvents(v: 'none' | 'auto') {
        for (const el of document.getElementsByTagName('iframe') as any) {
            el.style['pointer-events'] = v;
        }
    }
}
