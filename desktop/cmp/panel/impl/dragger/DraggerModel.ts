/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, lookup, XH} from '@xh/hoist/core';
import {observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {clamp, throttle} from 'lodash';
import type {KeyboardEvent} from 'react';
import {PanelModel} from '../../PanelModel';

/** Arrow keys that grow (+1) or shrink (-1) a panel, by the side it collapses toward. */
const ARROW_KEY_DIRS = {
    left: {ArrowRight: 1, ArrowLeft: -1},
    right: {ArrowLeft: 1, ArrowRight: -1},
    top: {ArrowDown: 1, ArrowUp: -1},
    bottom: {ArrowUp: 1, ArrowDown: -1}
};

export class DraggerModel extends HoistModel {
    override xhImpl = true;

    @lookup(PanelModel)
    panelModel: PanelModel;

    /** The splitter's hit area element, which starts a drag. */
    ref = createObservableRef<HTMLDivElement>();

    /** True while a drag is past the drag-to-collapse threshold. */
    @observable accessor snapPending = false;

    resizeState = null;
    startSize = null;
    diff = null;
    panelEl = null;
    panelParent = null;
    dragBar = null;
    maxSize = null;
    throttledSetSize;

    /** True if the panel can be resized now - i.e. it is resizable and not collapsed. */
    get canResize(): boolean {
        const {resizable, collapsed} = this.panelModel;
        return resizable && !collapsed;
    }

    /** Reset a resizable panel to its default size, or toggle a collapsible-only panel. */
    onDoubleClick = () => {
        const {panelModel} = this;
        if (this.canResize) {
            panelModel.size = panelModel.defaultSize;
        } else if (panelModel.collapsible) {
            panelModel.toggleCollapsed();
        }
    };

    /** Resize with the arrow keys (Shift for larger steps) and toggle collapse with Enter. */
    onKeyDown = (e: KeyboardEvent) => {
        const {panelModel} = this,
            panelEl = panelModel._resizeRef?.current,
            dir = ARROW_KEY_DIRS[panelModel.side]?.[e.key];

        if (e.key === 'Enter' && panelModel.collapsible) {
            panelModel.toggleCollapsed();
        } else if (dir && this.canResize && panelEl) {
            const currSize = this.getContentSize(panelEl),
                maxSize = this.getMaxSize(currSize, panelEl);
            panelModel.size = clamp(
                currSize + dir * (e.shiftKey ? 50 : 10),
                panelModel.minSize,
                maxSize
            );
        } else {
            return;
        }
        e.preventDefault();
    };

    override onLinked() {
        this.throttledSetSize = throttle(size => (this.panelModel.size = size), 50);

        // maintain listeners on el to ensure we can get non-passive handlers than can preventDefault()
        // React synthetic touch events on certain browsers (e.g. airwatch) don't yield that
        this.addReaction({
            track: () => this.ref.current,
            run: (current, old) => {
                this.toggleListeners(old, false);
                this.toggleListeners(current, true);
            }
        });
    }

    private toggleListeners(el, add: boolean) {
        if (!el) return;
        const fn = (element, event, handler, options = undefined) => {
            add
                ? element.addEventListener(event, handler, options)
                : element.removeEventListener(event, handler, options);
        };
        if (XH.isDesktop) {
            fn(el, 'dragstart', this.onDragStart);
            fn(el, 'dragend', this.onDragEnd);
            this.isFirefox // drag co-ordinates not impl in firefox -- use 'dragover' on doc
                ? fn(document, `dragover`, this.onDrag)
                : fn(el, 'drag', this.onDrag);
        } else {
            fn(el, 'touchstart', this.onDragStart);
            fn(el, 'touchmove', this.onDrag, {passive: false});
            fn(el, 'touchend', this.onDragEnd);
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
        const calcMaxSize = this.startSize + this.getSiblingAvailSize(panel);
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

    /** Size of the panel itself along its sizing dimension, excluding its splitter line. */
    private getContentSize(panelEl: HTMLElement): number {
        return this.getDimSize(panelEl) - this.getDimSize(this.panelModel.splitterRef.current);
    }

    /** Max size the panel can reach - its configured max or all the room its sibling has. */
    private getMaxSize(currSize: number, panelEl: HTMLElement): number {
        const sibAvail = this.getSiblingAvailSize(panelEl),
            calcMax = sibAvail == null ? Infinity : currSize + sibAvail,
            {maxSize} = this.panelModel;
        return maxSize ? Math.min(maxSize, calcMax) : calcMax;
    }

    /** Room the sibling panel can give up, or null if there is no sibling. */
    private getSiblingAvailSize(panelEl: HTMLElement): number {
        const {contentFirst, vertical} = this.panelModel,
            sib = (
                contentFirst ? panelEl.nextElementSibling : panelEl.previousElementSibling
            ) as HTMLElement;
        if (!sib) return null;

        // A resizable sibling cannot give up the room taken by its own splitter. Use client
        // (not offset) size, which excludes borders - flexbox does not collapse them on resize.
        const sibSplitter = sib.querySelector<HTMLElement>(':scope > .xh-panel-splitter'),
            sibSize = vertical ? sib.clientHeight : sib.clientWidth;
        return sibSize - this.getDimSize(sibSplitter);
    }

    private getDimSize(el: HTMLElement): number {
        if (!el) return 0;
        return this.panelModel.vertical ? el.offsetHeight : el.offsetWidth;
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

    private get isFirefox(): boolean {
        return navigator.userAgent.toLowerCase().includes('firefox');
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

    override destroy() {
        this.toggleListeners(this.ref.current, false);
        super.destroy();
    }
}
