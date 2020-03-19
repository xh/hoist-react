/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel, managed, RenderMode, RefreshMode} from '@xh/hoist/core';
import {RefreshModeContextModel} from '@xh/hoist/core/refresh';
import {observable, action} from '@xh/hoist/mobx';
import {withDefault} from '@xh/hoist/utils/js';
import {start} from '@xh/hoist/promise';
import {isNil} from 'lodash';

/**
 * PanelModel supports configuration and state-management for user-driven Panel resizing and
 * expand/collapse functionality, including the option to persist such state into a Hoist preference.
 */
@HoistModel
export class PanelModel {

    //-----------------------
    // Immutable Properties
    //-----------------------
    resizable;
    resizeWhileDragging;
    collapsible;
    defaultSize;
    minSize;
    maxSize;
    defaultCollapsed;
    side;
    renderMode;
    refreshMode;
    prefName;
    showSplitter;
    showSplitterCollapseButton;
    showHeaderCollapseButton;

    @managed refreshContextModel;

    //---------------------
    // Observable State
    //---------------------
    /** Is the Panel rendering in a collapsed state? */
    @observable collapsed = false;

    /** Size in pixels along sizing dimension.  Used when object is *not* collapsed. */
    @observable size = null;

    /** Is this panel currently resizing? */
    @observable isResizing = false;

    /**
     * RenderMode and RefreshMode consider this panel 'active' when it is not collapsed
     */
    get isActive() {
        return !this.collapsed;
    }

    /**
     * @param {Object} config
     * @param {boolean} [config.resizable] - Can panel be resized?
     * @param {boolean} [config.resizeWhileDragging] - Redraw panel as resize happens?
     * @param {boolean} [config.collapsible] - Can panel be collapsed, showing only its header?
     * @param {number} config.defaultSize - Default size (in px) of the panel.
     * @param {number} [config.minSize] - Minimum size (in px) to which the panel can be resized.
     * @param {?number} [config.maxSize] - Maximum size (in px) to which the panel can be resized.
     * @param {boolean} [config.defaultCollapsed] - Default collapsed state.
     * @param {string} config.side - Side towards which the panel collapses or shrinks. This relates
     *      to the position within a parent vbox or hbox in which the panel should be placed.
     * @param {RenderMode} [config.renderMode] - How should collapsed content be rendered?
     * @param {RefreshMode} [config.refreshMode] - How should collapsed content be refreshed?
     * @param {?string} [config.prefName] - preference name to store sizing and collapsed state.
     * @param {boolean} [config.showSplitter] - Should a splitter be rendered at the panel edge?
     * @param {boolean} [config.showSplitterCollapseButton] - Should the collapse button be visible
     *      on the splitter? Only applicable if the splitter is visible and the panel is collapsible.
     * @param {boolean} [config.showHeaderCollapseButton] - Should a collapse button be added to the
     *      end of the panel header? Only applicable if the panel is collapsible.
     */
    constructor({
        collapsible = true,
        resizable = true,
        resizeWhileDragging = false,
        defaultSize,
        minSize = 0,
        maxSize = null,
        defaultCollapsed = false,
        side,
        renderMode = RenderMode.LAZY,
        refreshMode = RefreshMode.ON_SHOW_LAZY,
        prefName = null,
        showSplitter = resizable || collapsible,
        showSplitterCollapseButton = showSplitter && collapsible,
        showHeaderCollapseButton = true
    }) {
        if ((collapsible || resizable) && (isNil(defaultSize) || isNil(side))) {
            console.error(
                "Must specify 'defaultSize' and 'side' for a collapsible or resizable PanelModel. Panel sizing disabled."
            );
            collapsible = false;
            resizable = false;
        }

        if (!isNil(maxSize) && (maxSize < minSize || maxSize < defaultSize)) {
            console.error("'maxSize' must be greater than 'minSize' and 'defaultSize'. No 'maxSize' will be set.");
            maxSize = null;
        }

        this.collapsible = collapsible;
        this.resizable = resizable;
        this.resizeWhileDragging = resizeWhileDragging;
        this.defaultSize = defaultSize;
        this.minSize = Math.min(minSize, defaultSize);
        this.maxSize = maxSize;
        this.defaultCollapsed = defaultCollapsed;
        this.side = side;
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;
        this.showSplitter = showSplitter;
        this.showSplitterCollapseButton = showSplitterCollapseButton;
        this.showHeaderCollapseButton = showHeaderCollapseButton;

        this.refreshContextModel = new RefreshModeContextModel(this);

        if (prefName && !XH.prefService.hasKey(prefName)) {
            console.warn(`Unknown preference for storing state of Panel '${prefName}'`);
            prefName = null;
        }
        this.prefName = prefName;

        // Set observable state
        const initial = prefName ? XH.getPref(prefName) : {};
        this.setSize(withDefault(initial.size, defaultSize));
        this.setCollapsed(withDefault(initial.collapsed, defaultCollapsed));

        if (prefName) {
            this.addReaction(this.prefReaction());
        }
    }

    //----------------------
    // Actions + public setters
    //----------------------
    @action
    setCollapsed(collapsed) {
        // When opening from collapsed position restore *default* size. This may be suboptimal
        // in some cases -- you lose user set "size" -- but avoids confusing behavior where
        // 'opening' a panel could cause it to shrink.
        if (this.collapsed === true && !collapsed) {
            this.size = this.defaultSize;
        }
        this.collapsed = collapsed;
        this.dispatchResize();
    }

    toggleCollapsed() {
        this.setCollapsed(!this.collapsed);
    }

    @action
    setSize(v) {
        this.size = v;
    }

    @action
    setIsResizing(v) {
        this.isResizing = v;
        if (!v) this.dispatchResize();
    }

    /**
     * Enable/disable dynamic re-rendering of contents while dragging to resize.
     * @param {boolean} v
     */
    setResizeWhileDragging(v) {
        this.resizeWhileDragging = v;
    }

    //---------------------------------------------
    // Implementation (for related private classes)
    //---------------------------------------------
    get vertical() {
        return this.side === 'top' || this.side === 'bottom';
    }

    // Does the Panel come before the resizing affordances?
    get contentFirst() {
        return this.side === 'top' || this.side === 'left';
    }

    //---------------------------------------------
    // Implementation (internal)
    //---------------------------------------------
    prefReaction() {
        return {
            track: () => [this.collapsed, this.size],
            run: ([collapsed, size]) => XH.setPref(this.prefName, {collapsed, size}),
            debounce: 500 // prefs are already batched, keep tight.
        };
    }

    dispatchResize() {
        // Forces other components to redraw if required.
        start(() => window.dispatchEvent(new Event('resize')));
    }
}