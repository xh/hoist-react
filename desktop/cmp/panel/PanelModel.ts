/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import React from 'react';
import {
    HoistModel,
    managed,
    ManagedRefreshContextModel,
    Persistable,
    PersistableState,
    PersistenceProvider,
    PersistOptions,
    RefreshContextModel,
    RefreshMode,
    RenderMode,
    Side
} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {action, makeObservable, observable, bindable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {throwIf} from '@xh/hoist/utils/js';
import {isNil, isNumber, isString} from 'lodash';
import {createRef} from 'react';
import {ModalSupportConfig, ModalSupportModel} from '../modalsupport/';
import {ErrorBoundaryConfig, ErrorBoundaryModel} from '@xh/hoist/cmp/error/ErrorBoundaryModel';

export interface PanelConfig {
    /** Can panel be resized? */
    resizable?: boolean;

    /** Redraw panel as resize happens? */
    resizeWhileDragging?: boolean;

    /** Can panel be collapsed, showing only its header? */
    collapsible?: boolean;

    /**
     * Default size (in px or %) of the panel.
     * Supported formats:
     *  1. Pixels, as a number
     *  2. Pixels, as a string 'Npx'
     *  3. Percent, as a string 'N%'
     */
    defaultSize?: number | string;

    /** Minimum size (in px) to which the panel can be resized. */
    minSize?: number;

    /** Maximum size (in px) to which the panel can be resized. */
    maxSize?: number;

    /** Default collapsed state. */
    defaultCollapsed?: boolean;

    /**
     * Side towards which the panel collapses or shrinks. This relates
     * to the position within a parent vbox or hbox in which the panel should be placed.
     */
    side?: Side;

    /**
     * Set to true to enable built-in support for showing panel contents in a modal, or provide a
     * config to further configure. Default false.
     */
    modalSupport?: boolean | ModalSupportConfig;

    /**
     * Set to true to place an ErrorBoundary around the panel, or provide a
     * config to further configure.  Default false.
     */
    errorBoundary?: boolean | ErrorBoundaryConfig;

    /** How should collapsed content be rendered? Ignored if collapsible is false. */
    renderMode?: RenderMode;

    /** How should collapsed content be refreshed? Ignored if collapsible is false. */
    refreshMode?: RefreshMode;

    /** Options governing persistence. */
    persistWith?: PersistOptions;

    /** Should a splitter be rendered at the panel edge? */
    showSplitter?: boolean;

    /**
     * Should the collapse button be visible on the splitter? Only applicable if the splitter
     * is visible and the panel is collapsible.
     */
    showSplitterCollapseButton?: boolean;

    /**
     * Should a collapse button be added to the end of the panel header? Only applicable if the
     * panel is collapsible.
     */
    showHeaderCollapseButton?: boolean;

    /**
     * Should a modal toggle button be added to the end of the panel header? Only applicable if
     * the panel has modal support.
     */
    showModalToggleButton?: boolean;

    /** @internal */
    xhImpl?;
}

export interface PanelPersistState {
    collapsed?: boolean;
    size?: number | string;
}

/**
 * PanelModel supports configuration and state-management for user-driven Panel resizing and
 * expand/collapse, along with support for saving this state via a configured PersistenceProvider.
 */
export class PanelModel extends HoistModel implements Persistable<PanelPersistState> {
    declare config: PanelConfig;

    //-----------------------
    // Immutable Properties
    //-----------------------
    readonly resizable: boolean;
    readonly collapsible: boolean;
    readonly defaultSize: number | string;
    readonly minSize: number;
    readonly maxSize: number;
    readonly defaultCollapsed: boolean;
    readonly side: Side;
    readonly renderMode: RenderMode;
    readonly refreshMode: RefreshMode;
    readonly showSplitter: boolean;
    readonly showSplitterCollapseButton: boolean;
    readonly showHeaderCollapseButton: boolean;
    readonly showModalToggleButton: boolean;

    @managed modalSupportModel: ModalSupportModel;
    @managed refreshContextModel: RefreshContextModel;
    @managed errorBoundaryModel: ErrorBoundaryModel;

    //----------------
    // Settable State
    //----------------
    resizeWhileDragging: boolean;

    //---------------------
    // Observable State
    //---------------------
    /**
     * True when collapsed in its "home" location as per this model's state.
     * See also {@link isRenderedCollapsed}, which takes modal state into account.
     */
    @observable
    collapsed: boolean = false;

    /** Size in pixels or percents along sizing dimension. Used when object is *not* collapsed. */
    @bindable
    size: number | string = null;

    /** Is this panel currently resizing? */
    @observable
    isResizing: boolean = false;

    /** Is the panel rendering in its modal view state? Observable property. */
    get isModal(): boolean {
        return !!this.modalSupportModel?.isModal;
    }

    get hasModalSupport(): boolean {
        return !!this.modalSupportModel;
    }

    /** True when both collapsed and not currently in a modal - i.e. *really* collapsed. */
    get isRenderedCollapsed(): boolean {
        return this.collapsed && !this.isModal;
    }

    get isActive(): boolean {
        return !this.isRenderedCollapsed;
    }

    //-----------------
    // Implementation
    //-----------------
    _resizeRef: React.RefObject<HTMLDivElement>;
    splitterRef = createRef<HTMLDivElement>();

    constructor({
        collapsible = true,
        resizable = true,
        resizeWhileDragging = false,
        defaultSize,
        minSize = 0,
        maxSize = null,
        defaultCollapsed = false,
        side,
        modalSupport = false,
        errorBoundary = false,
        renderMode = 'lazy',
        refreshMode = 'onShowLazy',
        persistWith = null,
        showSplitter = resizable || collapsible,
        showSplitterCollapseButton = showSplitter && collapsible,
        showHeaderCollapseButton = true,
        showModalToggleButton = true,
        xhImpl = false
    }: PanelConfig) {
        super();
        makeObservable(this);
        this.xhImpl = xhImpl;

        defaultSize =
            isString(defaultSize) && defaultSize.endsWith('px')
                ? parseInt(defaultSize, 10)
                : defaultSize;

        if ((collapsible || resizable) && (isNil(defaultSize) || isNil(side))) {
            this.logError(
                "Must specify 'defaultSize' and 'side' for a collapsible or resizable PanelModel. Panel sizing disabled."
            );
            collapsible = false;
            resizable = false;
        }

        if (!isNil(maxSize) && maxSize < minSize) {
            this.logError("'maxSize' must be greater than 'minSize'. No 'maxSize' will be set.");
            maxSize = null;
        }

        if (resizable && !resizeWhileDragging && !showSplitter) {
            this.logError(
                "Must not set 'showSplitter = false' for a resizable PanelModel unless 'resizeWhileDragging` is enabled. Panel sizing disabled."
            );
            resizable = false;
        }

        this.collapsible = collapsible;
        this.resizable = resizable;
        this.resizeWhileDragging = resizeWhileDragging;
        this.size = this.defaultSize = defaultSize;
        this.minSize = minSize;
        this.maxSize = maxSize;
        this.collapsed = this.defaultCollapsed = defaultCollapsed;
        this.side = side;
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;
        this.showSplitter = showSplitter;
        this.showSplitterCollapseButton = showSplitterCollapseButton;
        this.showHeaderCollapseButton = collapsible && showHeaderCollapseButton;
        this.showModalToggleButton = modalSupport && showModalToggleButton;

        // Set up various optional functionality;
        if (modalSupport) {
            this.modalSupportModel =
                modalSupport === true
                    ? new ModalSupportModel()
                    : new ModalSupportModel(modalSupport);
        }

        if (errorBoundary) {
            this.errorBoundaryModel =
                errorBoundary === true
                    ? new ErrorBoundaryModel()
                    : new ErrorBoundaryModel(errorBoundary);
        }

        if (collapsible) {
            this.refreshContextModel = new ManagedRefreshContextModel(this);
        }

        if (collapsible || resizable) {
            this._resizeRef = createRef();
        }

        if (persistWith) {
            PersistenceProvider.create({
                persistOptions: {
                    path: 'panel',
                    ...persistWith
                },
                target: this
            });
        }
    }

    //----------------------
    // Actions + public setters
    //----------------------
    @action
    setCollapsed(collapsed: boolean) {
        throwIf(collapsed && !this.collapsible, 'Panel does not support collapsing.');

        // When opening we never want to shrink -- in that degenerate case restore default size.
        // Can happen when no min height and title bar, and user has sized panel to be very small.
        if (this.collapsed && !collapsed) {
            const el = this._resizeRef?.current,
                currSize = this.vertical ? el?.offsetHeight : el?.offsetWidth,
                {size} = this;
            if (isNil(currSize) || isNil(size) || (isNumber(size) && size < currSize)) {
                this.size = this.defaultSize;
            }
        }

        this.collapsed = collapsed;
        this.dispatchResize();
    }

    toggleCollapsed() {
        this.setCollapsed(!this.collapsed);
    }

    setIsModal(isModal: boolean) {
        throwIf(!this.hasModalSupport, 'ModalSupport not enabled for this panel.');
        this.modalSupportModel.isModal = isModal;
    }

    toggleIsModal() {
        this.setIsModal(!this.isModal);
    }

    @action
    setIsResizing(v: boolean) {
        this.isResizing = v;
        if (!v) this.dispatchResize();
    }

    /**
     * Enable/disable dynamic re-rendering of contents while dragging to resize.
     */
    setResizeWhileDragging(v: boolean) {
        this.resizeWhileDragging = v;
    }

    //---------------------------------------------
    // Persistable Interface
    //---------------------------------------------
    getPersistableState(): PersistableState<PanelPersistState> {
        const ret: PanelPersistState = {};
        if (this.collapsible) ret.collapsed = this.collapsed;
        if (this.resizable) ret.size = this.size;
        return new PersistableState(ret);
    }

    setPersistableState(state: PersistableState<PanelPersistState>): void {
        const {collapsed, size} = state.value;
        if (this.resizable && !isNil(size)) this.size = size;
        if (this.collapsible && !isNil(collapsed)) this.setCollapsed(collapsed);
    }

    //---------------------------------------------
    // Implementation (for related private classes)
    //---------------------------------------------
    get vertical(): boolean {
        return this.side === 'top' || this.side === 'bottom';
    }

    // Does the Panel come before the resizing affordances?
    get contentFirst(): boolean {
        return this.side === 'top' || this.side === 'left';
    }

    get isCollapsedToLeftOrRight(): boolean {
        return this.isRenderedCollapsed && !this.vertical;
    }

    enforceSizeLimits() {
        if (this.collapsed) return;

        const el = this._resizeRef?.current,
            height = el?.offsetHeight,
            width = el?.offsetWidth,
            isVisible = height > 0 && width > 0;

        if (!isVisible) return;

        const currSize = this.vertical ? height : width;

        let size;
        if (this.maxSize && this.maxSize < currSize) {
            size = this.maxSize;
        } else if (this.minSize && this.minSize > currSize) {
            size = this.minSize;
        }

        if (size) {
            this.size = size;
            this.dispatchResize();
        }
    }

    //---------------------------------------------
    // Implementation (internal)
    //---------------------------------------------

    private dispatchResize() {
        // Forces other components to redraw if required.
        wait().then(() => window.dispatchEvent(new Event('resize')));
    }
}
