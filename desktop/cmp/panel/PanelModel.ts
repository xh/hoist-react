/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {
    HoistModel,
    managed,
    ManagedRefreshContextModel,
    PersistenceProvider,
    PersistOptions,
    PrefProvider, RefreshContextModel,
    RefreshMode,
    RenderMode,
    Side,
    XH
} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {action, makeObservable, observable, comparer, bindable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {throwIf} from '@xh/hoist/utils/js';
import {isNil} from 'lodash';
import {createRef} from 'react';
import {ModalSupportConfig, ModalSupportModel} from '../modalsupport/';

export interface PanelConfig {

    /** Can panel be resized? */
    resizable?: boolean;

    /** Redraw panel as resize happens? */
    resizeWhileDragging?: boolean;

    /** Can panel be collapsed, showing only its header? */
    collapsible?: boolean;

    /** Default size (in px) of the panel. */
    defaultSize?: number;

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
     * config to further configure.
     */
    modalSupport?: boolean|ModalSupportConfig;

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


/**
 * PanelModel supports configuration and state-management for user-driven Panel resizing and
 * expand/collapse, along with support for saving this state via a configured PersistenceProvider.
 */
export class PanelModel extends HoistModel {
    declare config: PanelConfig;

    //-----------------------
    // Immutable Properties
    //-----------------------
    readonly resizable: boolean;
    readonly collapsible: boolean;
    readonly defaultSize: number;
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
    @managed provider: PersistenceProvider;

    //----------------
    // Settable State
    //----------------
    resizeWhileDragging: boolean;

    //---------------------
    // Observable State
    //---------------------
    /** Is the Panel rendering in a collapsed state? */
    @observable
    collapsed: boolean = false;

    /** Size in pixels along sizing dimension.  Used when object is *not* collapsed. */
    @bindable
    size: number = null;

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

    get isActive(): boolean {
        return !this.collapsed;
    }

    //-----------------
    // Implementation
    //-----------------
    _resizeRef;

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

        if (resizable && !resizeWhileDragging && !showSplitter) {
            console.error("Must not set 'showSplitter = false' for a resizable PanelModel unless 'resizeWhileDragging` is enabled. Panel sizing disabled.");
            resizable = false;
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
        this.showModalToggleButton = showModalToggleButton;

        if (modalSupport) {
            this.modalSupportModel = modalSupport === true ?
                new ModalSupportModel() :
                new ModalSupportModel(modalSupport);
        }

        // Set up various optional functionality;
        if (collapsible) {
            this.refreshContextModel = new ManagedRefreshContextModel(this);
        }

        if (collapsible || resizable) {
            this._resizeRef = createRef();
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
        this.size = resizable && !isNil(state?.size) ? state.size : defaultSize;
        this.setCollapsed(collapsible && !isNil(state?.collapsed) ? state.collapsed : defaultCollapsed);

        // Attach to provider last
        if (this.provider) {
            this.addReaction({
                equals: comparer.shallow,
                track: () => {
                    const state: any = {};
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
    setCollapsed(collapsed: boolean) {
        throwIf(collapsed  && !this.collapsible, 'Panel does not support collapsing.');

        // When opening we never want to shrink -- in that degenerate case restore default size.
        // Can happen when no min height and title bar, and user has sized panel to be very small.
        if (this.collapsed && !collapsed) {
            const el = this._resizeRef?.current,
                currSize = this.vertical ? el?.offsetHeight : el?.offsetWidth,
                {size} = this;
            if (isNil(currSize) || isNil(size) || size < currSize) {
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
    // Implementation (for related private classes)
    //---------------------------------------------
    get vertical(): boolean {
        return this.side === 'top' || this.side === 'bottom';
    }

    // Does the Panel come before the resizing affordances?
    get contentFirst(): boolean {
        return this.side === 'top' || this.side === 'left';
    }

    //---------------------------------------------
    // Implementation (internal)
    //---------------------------------------------
    private legacyState() {
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

    private dispatchResize() {
        // Forces other components to redraw if required.
        wait().then(() => window.dispatchEvent(new Event('resize')));
    }
}
