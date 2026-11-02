/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, lookup, XH} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
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

/** Smallest drag-to-collapse threshold, so panels with no minSize can still drag-collapse. */
const MIN_SNAP_SIZE = 24;

/**
 * Drives resizing of a panel from its splitter: pointer drag (mouse, pen, or touch), keyboard,
 * and double-click, plus drag-to-collapse.
 * @internal
 */
export class DraggerModel extends HoistModel {
    override xhImpl = true;

    @lookup(PanelModel)
    panelModel: PanelModel;

    /** The splitter's hit area element, which starts a drag. */
    ref = createObservableRef<HTMLDivElement>();

    /** True while a drag is past the drag-to-collapse threshold. */
    @observable accessor snapPending = false;

    private throttledSetSize;

    // State of an in-progress drag.
    private panelEl: HTMLElement = null;
    private ghost: HTMLDivElement = null;
    private startPos: number = null;
    private startSize: number = null;
    private startModelSize: number | string = null;
    private maxSize: number = null;
    private dragSize: number = null;

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

        // Bind native listeners to the hit element so handlers can call preventDefault().
        this.addReaction({
            track: () => this.ref.current,
            run: (current, old) => {
                old?.removeEventListener('pointerdown', this.onPointerDown);
                current?.addEventListener('pointerdown', this.onPointerDown);
            }
        });
    }

    override destroy() {
        this.ref.current?.removeEventListener('pointerdown', this.onPointerDown);
        if (this.isDragging) this.endDrag();
        super.destroy();
    }

    //------------------
    // Drag
    //------------------
    private get isDragging(): boolean {
        return this.startPos != null;
    }

    private onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0 || !this.canResize || this.isDragging) return;

        const {panelModel} = this,
            {vertical} = panelModel,
            panelEl = panelModel._resizeRef.current,
            hit = this.ref.current;

        throwIf(
            !panelEl.nextElementSibling && !panelEl.previousElementSibling,
            'Resizable panel has no sibling panel against which to resize.'
        );

        // Stop text selection and focus changes. Click and double-click still fire.
        e.preventDefault();
        e.stopPropagation();

        hit.setPointerCapture(e.pointerId);
        this.toggleMoveListeners(hit, true);

        this.panelEl = panelEl;
        this.startPos = vertical ? e.clientY : e.clientX;
        this.startSize = this.getContentSize(panelEl);
        this.startModelSize = panelModel.size;
        this.maxSize = this.getMaxSize(this.startSize, panelEl);
        this.dragSize = null;

        // Force the resize cursor everywhere and block text selection for the whole drag.
        if (XH.isDesktop) this.setIframePointerEvents('none');
        document.body.classList.add(this.bodyDragCls);
        panelModel.setIsResizing(true);

        if (!panelModel.resizeWhileDragging) this.ghost = this.createGhost(panelEl);
    };

    private onPointerMove = (e: PointerEvent) => {
        if (!this.isDragging) return;
        e.preventDefault();

        const {side, vertical, collapsible, minSize, resizeWhileDragging} = this.panelModel,
            pos = vertical ? e.clientY : e.clientX,
            sign = side === 'left' || side === 'top' ? 1 : -1,
            rawSize = this.startSize + sign * (pos - this.startPos),
            size = clamp(rawSize, minSize, this.maxSize);

        this.setSnapPending(collapsible && rawSize < Math.max(minSize / 2, MIN_SNAP_SIZE));
        this.dragSize = size;

        if (resizeWhileDragging) {
            this.throttledSetSize(size);
        } else {
            this.moveGhost(size);
        }
    };

    private onPointerEnd = () => {
        if (!this.isDragging) return;

        const {panelModel, snapPending, dragSize} = this;
        if (snapPending) {
            // Collapse, and keep the pre-drag size for the next expand.
            this.throttledSetSize.cancel();
            panelModel.size = this.startModelSize;
            panelModel.setCollapsed(true);
        } else if (panelModel.resizeWhileDragging) {
            this.throttledSetSize.flush();
        } else if (dragSize != null) {
            panelModel.size = dragSize;
        }

        this.endDrag();
    };

    /** Clear all drag state and the document-level side effects of a drag. */
    private endDrag() {
        const hit = this.ref.current;
        if (hit) this.toggleMoveListeners(hit, false);

        if (XH.isDesktop) this.setIframePointerEvents('auto');
        document.body.classList.remove(this.bodyDragCls);
        this.setSnapPending(false);
        this.ghost?.remove();
        this.panelModel.setIsResizing(false);

        this.panelEl = null;
        this.ghost = null;
        this.startPos = null;
        this.startSize = null;
        this.startModelSize = null;
        this.maxSize = null;
        this.dragSize = null;
    }

    private toggleMoveListeners(el: HTMLElement, add: boolean) {
        const fn = add ? el.addEventListener : el.removeEventListener;
        fn.call(el, 'pointermove', this.onPointerMove);
        fn.call(el, 'pointerup', this.onPointerEnd);
        fn.call(el, 'pointercancel', this.onPointerEnd);
        fn.call(el, 'lostpointercapture', this.onPointerEnd);
    }

    @action
    private setSnapPending(v: boolean) {
        if (v === this.snapPending) return;
        this.snapPending = v;
        this.panelEl?.classList.toggle('xh-resizable--snap-pending', v);
        this.ghost?.classList.toggle('xh-panel-splitter-ghost--snap', v);
    }

    private get bodyDragCls(): string {
        return `xh-panel-splitter-dragging--${this.panelModel.vertical ? 'ns' : 'ew'}`;
    }

    //------------------
    // Ghost line
    //------------------
    /** Accent line that tracks the pointer when the panel does not resize while dragging. */
    private createGhost(panelEl: HTMLElement): HTMLDivElement {
        const {vertical} = this.panelModel,
            ret = document.createElement('div'),
            {style} = ret;

        ret.className = `xh-panel-splitter-ghost xh-panel-splitter-ghost--${vertical ? 'ns' : 'ew'}`;
        style.display = 'none'; // until the first move, to prevent a flash
        if (vertical) {
            style.left = `${panelEl.offsetLeft}px`;
            style.width = `${panelEl.offsetWidth}px`;
        } else {
            style.top = `${panelEl.offsetTop}px`;
            style.height = `${panelEl.offsetHeight}px`;
        }
        panelEl.parentElement.appendChild(ret);
        return ret;
    }

    /** Center the ghost on where the splitter line would sit at the given size. */
    private moveGhost(size: number) {
        const {ghost, panelEl, startSize} = this,
            {vertical, contentFirst} = this.panelModel;
        if (!ghost) return;

        const panelStart = vertical ? panelEl.offsetTop : panelEl.offsetLeft,
            lineOffset = contentFirst ? size : startSize - size;

        ghost.style[vertical ? 'top' : 'left'] = `${panelStart + lineOffset - 1}px`;
        ghost.style.display = 'block';
    }

    //------------------
    // Sizing
    //------------------
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

    /**
     * @param v - Workaround to allow dragging over iframe, which is its own
     *  separate document and cannot listen for events from main document.
     */
    private setIframePointerEvents(v: 'none' | 'auto') {
        for (const el of document.getElementsByTagName('iframe')) {
            el.style.pointerEvents = v;
        }
    }
}
