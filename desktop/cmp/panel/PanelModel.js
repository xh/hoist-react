/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {
    HoistModel,
    managed,
    ManagedRefreshContextModel,
    PersistenceProvider,
    PrefProvider,
    RefreshMode,
    RenderMode,
    XH
} from '@xh/hoist/core';
import {action, observable, comparer} from '@xh/hoist/mobx';
import {start} from '@xh/hoist/promise';
import {apiRemoved} from '@xh/hoist/utils/js';
import {isNil} from 'lodash';

/**
 * PanelModel supports configuration and state-management for user-driven Panel resizing and
 * expand/collapse, along with support for saving this state via a configured PersistenceProvider.
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
    @managed provider;

    //---------------------
    // Observable State
    //---------------------
    /** Is the Panel rendering in a collapsed state? */
    @observable collapsed = false;

    /** Size in pixels along sizing dimension.  Used when object is *not* collapsed. */
    @observable size = null;

    /** Is this panel currently resizing? */
    @observable isResizing = false;

    get isActive() {
        return !this.collapsed;
    }

    /**
     * @param {Object} c - PanelModel configuration
     * @param {boolean} [c.resizable] - Can panel be resized?
     * @param {boolean} [c.resizeWhileDragging] - Redraw panel as resize happens?
     * @param {boolean} [c.collapsible] - Can panel be collapsed, showing only its header?
     * @param {number} c.defaultSize - Default size (in px) of the panel.
     * @param {number} [c.minSize] - Minimum size (in px) to which the panel can be resized.
     * @param {?number} [c.maxSize] - Maximum size (in px) to which the panel can be resized.
     * @param {boolean} [c.defaultCollapsed] - Default collapsed state.
     * @param {string} c.side - Side towards which the panel collapses or shrinks. This relates
     *      to the position within a parent vbox or hbox in which the panel should be placed.
     * @param {RenderMode} [c.renderMode] - How should collapsed content be rendered?
     *      Ignored if collapsible is false.
     * @param {RefreshMode} [c.refreshMode] - How should collapsed content be refreshed?
     *      Ignored if collapsible is false.
     * @param {PersistOptions} [c.persistWith] - options governing persistence.
     * @param {boolean} [c.showSplitter] - Should a splitter be rendered at the panel edge?
     * @param {boolean} [c.showSplitterCollapseButton] - Should the collapse button be visible
     *      on the splitter? Only applicable if the splitter is visible and the panel is collapsible.
     * @param {boolean} [c.showHeaderCollapseButton] - Should a collapse button be added to the
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
        persistWith = null,
        showSplitter = resizable || collapsible,
        showSplitterCollapseButton = showSplitter && collapsible,
        showHeaderCollapseButton = true,
        ...rest
    }) {
        if ((collapsible || resizable) && (isNil(defaultSize) || isNil(side))) {
            console.error(
                "Must specify 'defaultSize' and 'side' for a collapsible or resizable PanelModel. Panel sizing disabled."
            );
            collapsible = false;
            resizable = false;
        }

        apiRemoved(rest.prefName, 'prefName', 'Specify "persistWith" instead.');

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

        if (collapsible) {
            this.refreshContextModel = new ManagedRefreshContextModel(this);
        }

        // Read state from provider -- fail gently
        let state = null;
        if (persistWith) {
            try {
                this.provider = PersistenceProvider.create({path: 'panel', ...persistWith});
                state = this.provider.read() ?? this.legacyState();
            } catch (e) {
                console.error(e);
                XH.safeDestroy(this.provider);
                this.provider = null;
            }
        }

        // Initialize state.
        this.setSize(resizable && !isNil(state?.size) ? state.size : defaultSize);
        this.setCollapsed(collapsible && !isNil(state?.collapsed) ? state.collapsed : defaultCollapsed);

        // Attach to provider last
        if (this.provider) {
            this.addReaction({
                equals: comparer.shallow,
                track: () => {
                    const state = {};
                    if (collapsible) state.collapsed = this.collapsed;
                    if (resizable) state.size = this.size;
                    return state;
                },
                run: (state) => this.provider.write(state)
            });
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
    legacyState() {
        const {provider} = this;
        if (provider instanceof PrefProvider) {
            try {
                const data = XH.getPref(provider.key);
                if (data && !isNil(data.collapsed) && !isNil(data.size)) {
                    provider.write(data);
                    provider.clear('collapsed');
                    provider.clear('size');
                    return data;
                }
            } catch (e) {
                console.error('Failed reading legacy state');
            }
        }
        return null;
    }

    dispatchResize() {
        // Forces other components to redraw if required.
        start(() => window.dispatchEvent(new Event('resize')));
    }
}