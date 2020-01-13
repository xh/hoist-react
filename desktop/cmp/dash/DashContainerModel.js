/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {action, observable, bindable} from '@xh/hoist/mobx';
import {GoldenLayout} from '@xh/hoist/kit/golden-layout';
import {DashRefreshMode, DashRenderMode, DashEvent} from '@xh/hoist/enums';
import {Icon, convertIconToSvg} from '@xh/hoist/icon';
import {createObservableRef} from '@xh/hoist/utils/react';
import {ensureUniqueBy, throwIf} from '@xh/hoist/utils/js';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {start, wait} from '@xh/hoist/promise';
import {isEmpty, isEqual, isString, castArray} from 'lodash';

import {dashView} from './DashView';
import {convertGLToState, convertStateToGL, getGLConfig} from './impl/DashContainerUtils';

/**
 * Model for a DashContainer, representing its contents and layout state.
 *
 * Note that loading state will destroy and reinitialize all components. Therefore,
 * it is recommended you do so sparingly.
 *
 * This object provides support for managing dash views, adding new views on the fly,
 * and tracking / loading state.
 */
@HoistModel
export class DashContainerModel {

    /** @member {Object[]} */
    @observable.ref state;

    /** @member {DashViewSpec[]} */
    @observable.ref viewSpecs = [];

    /** @member {GoldenLayout} */
    @observable.ref goldenLayout;

    /** member {ModelLookupContext} */
    @bindable.ref modelLookupContext;

    /** member {boolean} */
    @observable dialogIsOpen;

    /** @member {Object} */
    defaultState;

    /** @member {Object} */
    settings;

    /** @member {Ref} */
    containerRef = createObservableRef();

    /** @member {boolean} */
    enableAdd;

    /** @member {DashRenderMode} */
    renderMode;

    /** @member {DashRefreshMode} */
    refreshMode;

    @managed
    loadModel = new PendingTaskModel();

    /**
     * @param {DashViewSpec[]} viewSpecs - A collection of viewSpecs, each describing a type of view
     *      that can be displayed in this container
     * @param {Object[]} defaultState - Default layout state for this container.
     * @param {Object[]} [initState] - State with which to initialize for this container,
     *      if different from defaultState.
     * @param {Object} [settings] - custom settings to be passed to the GoldenLayout instance.
     *      @see http://golden-layout.com/docs/Config.html
     * @param {boolean} [c.enableAdd] - true (default) to include a '+' button in each stack header,
     *      which opens the provided 'Add View' dialog.
     * @param {DashRenderMode} [c.renderMode] - strategy for rendering DashViews. Can be set
     *      per-view via `DashViewSpec.renderMode`. See enum for description of supported modes.
     * @param {DashRefreshMode} [c.refreshMode] - strategy for refreshing DashViews. Can be set
     *      per-view via `DashViewSpec.refreshMode`. See enum for description of supported modes.
     */
    constructor({
        viewSpecs = [],
        defaultState = [],
        initState,
        settings,
        enableAdd = true,
        renderMode = DashRenderMode.LAZY,
        refreshMode = DashRefreshMode.ON_SHOW_LAZY
    }) {
        throwIf(isEmpty(viewSpecs), 'A collection of DashViewSpecs are required');
        throwIf(isEmpty(defaultState), 'DashContainerModel must be intialised with default state');

        this.defaultState = castArray(defaultState);
        this.settings = settings;
        this.enableAdd = enableAdd;
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;

        // Add viewSpecs
        ensureUniqueBy(viewSpecs, 'id');
        viewSpecs.forEach(viewSpec => this.addViewSpec(viewSpec));

        // Initialize GoldenLayouts with default state once ref is ready
        this.addReaction({
            track: () => this.containerRef.current,
            run: () => {
                const state = !isEmpty(initState) && !isEqual(initState, defaultState) ? initState : defaultState;
                this.loadStateAsync(state);
            }
        });

        this.addReaction({
            track: () => this.viewSpecs,
            run: () => this.registerComponents()
        });
    }

    @action
    async loadStateAsync(state) {
        start(() => {
            // Recreate GoldenLayouts with state
            this.destroyGoldenLayouts();

            const content = convertStateToGL(state, this.viewSpecs);
            this.goldenLayout = new GoldenLayout({
                content,
                settings: {
                    // Remove icons by default
                    showPopoutIcon: false,
                    showMaximiseIcon: false,
                    showCloseIcon: false,
                    ...this.settings
                },
                dimensions: {
                    borderWidth: 6,
                    headerHeight: 25
                }
            }, this.containerRef.current);

            // Initialize GoldenLayout
            this.registerComponents();
            this.goldenLayout.on('stateChanged', () => this.onStateChanged());
            this.goldenLayout.on('stackCreated', stack => this.onStackCreated(stack));
            this.goldenLayout.init();
        }).linkTo(this.loadModel);
    }

    async resetStateAsync() {
        return this.loadStateAsync(this.defaultState);
    }

    @action
    onStateChanged() {
        const {content} = this.goldenLayout.toConfig();
        this.state = convertGLToState(content);
        this.renderIcons();
    }

    onResize() {
        this.goldenLayout.updateSize();
    }

    //-----------------
    // Views
    //-----------------
    /**
     * @param {DashViewSpec} viewSpec - DashViewSpec to be added.
     */
    @action
    addViewSpec(viewSpec) {
        const {id, content, title} = viewSpec;

        throwIf(!id, 'DashViewSpec requires an id');
        throwIf(!content, 'DashViewSpec requires content');
        throwIf(!title, 'DashViewSpec requires a title');
        throwIf(this.getViewSpec(id), `DashViewSpec with id=${id} already exists`);

        this.viewSpecs = [viewSpec, ...this.viewSpecs];
    }

    getViewSpec(id) {
        return this.viewSpecs.find(it => it.id === id);
    }

    /**
     * Add a DashView to the container.
     *
     * @param {(DashViewSpec|string)} viewSpec - DashViewSpec (or string id) to add to the container
     * @param {object} container - GoldenLayout container to add it to. If not provided, will be added to the root container.
     */
    addView(viewSpec, container) {
        const {goldenLayout} = this;
        if (!goldenLayout) return;

        if (isString(viewSpec)) viewSpec = this.getViewSpec(viewSpec);
        if (!container) container = goldenLayout.root.contentItems[0];

        const config = getGLConfig(viewSpec);
        container.addChild(config);
    }

    /**
     * Get all DashView instances currently rendered in the container
     */
    getViews() {
        const {goldenLayout} = this;
        if (!goldenLayout) return [];
        return goldenLayout.root.getItemsByType('component');
    }

    /**
     * Get all DashView instances with a given ViewSpec.id
     */
    getViewsBySpecId(id) {
        return this.getViews().filter(it => it.config.component === id);
    }

    /**
     * Get rendered DashView instance by DashViewModel.id
     */
    getViewByModelId(id) {
        return this.getViews().find(it => {
            const instanceId = it.instance?._reactComponent?.props?.id;
            return instanceId && instanceId === id;
        });
    }

    /**
     * Lookup the DashViewModel instance id of a rendered view
     */
    getViewModelId(view) {
        if (!view || !view.isInitialised || !view.isComponent) return;
        return view.instance?._reactComponent?.props?.id;
    }

    /**
     * Called to automatically synchronize GoldenLayouts' component registry with our collection of viewSpecs
     */
    registerComponents() {
        const {goldenLayout} = this;
        if (!goldenLayout) return;
        this.viewSpecs.forEach(viewSpec => {
            try {
                goldenLayout.registerComponent(viewSpec.id, (props) => {
                    const {id, ...rest} = props;
                    return dashView({
                        model: {
                            id,
                            viewSpec,
                            containerModel: this
                        },
                        ...rest
                    });
                });
            } catch {
                // GoldenLayout.registerComponent() throws if component is already registered.
                // There doesn't seem to be a way to check if a component is already registered without
                // throwing (GoldenLayout.getComponent() throws if the component is *not* registered)
            }
        });
    }

    //-----------------
    // Implementation - Add View Dialog
    //-----------------
    onStackCreated(stack) {
        // Listen to active item change to support DashRenderMode
        stack.on('activeContentItemChanged', () => this.onStackActiveItemChange(stack));

        // Add '+' icon and attach click listener for adding components
        if (this.enableAdd) {
            const icon = convertIconToSvg(Icon.add());
            stack.header.controlsContainer.append(`<div class="xh-dash-container-add-button">${icon}</div>`);
            const btn = stack.header.controlsContainer.find('.xh-dash-container-add-button');
            btn.click(() => this.openViewDialog(stack));
        }
    }

    async onStackActiveItemChange(stack) {
        if (!this.goldenLayout.isInitialised) {
            // We must wait a tick on first occurrence to ensure elements are rendered
            await wait(100);
        }

        const views = stack.getItemsByType('component'),
            activeItem = stack.getActiveContentItem();

        views.forEach(view => {
            const id = this.getViewModelId(view),
                isActive = view === activeItem;

            this.emitEvent(DashEvent.IS_ACTIVE, {id, isActive});
        });
    }

    emitEvent(name, payload) {
        this.goldenLayout.eventHub.emit(name, payload);
    }

    @action
    openViewDialog(stack) {
        this._dialogSelectedStack = stack;
        this.dialogIsOpen = true;
    }

    @action
    closeViewDialog() {
        this.dialogIsOpen = false;
    }

    submitViewDialog(viewSpec) {
        this.addView(viewSpec, this._dialogSelectedStack);
    }

    //-----------------
    // Icons
    //-----------------
    renderIcons() {
        // For each view, insert icon in tab if required
        const views = this.getViews();
        views.forEach(view => {
            const id = view.config.component,
                el = view.tab.element,
                viewSpec = this.getViewSpec(id);

            if (viewSpec?.icon && !el.find('svg.svg-inline--fa').length) {
                const iconSvg = convertIconToSvg(viewSpec.icon);
                el.find('.lm_title').before(iconSvg);
            }
        });
    }

    destroy() {
        this.destroyGoldenLayouts();
    }

    destroyGoldenLayouts() {
        if (!this.goldenLayout) return;
        this.goldenLayout.destroy();
    }

}

/**
 * @typedef {Object} DashViewSpec
 * @property {string} id - unique identifier of the DashViewSpec
 * @property {Object} content - content to be rendered by the DashView. Component class or a
 *      custom element factory of the form returned by elemFactory.
 * @property {string} title - Title text added to the tab header.
 * @property {Icon} [icon] - An icon placed at the left-side of the tab header.
 * @property {boolean} [unique] - true to prevent multiple instances of this view. Default false.
 * @property {boolean} [allowClose] - true (default) to allow removing from the DashContainer.
 * @property {DashRenderMode} [c.renderMode] - strategy for rendering this DashView. If null, will
 *      default to its container's mode. See enum for description of supported modes.
 * @property {DashRefreshMode} [c.refreshMode] - strategy for refreshing this DashView. If null, will
 *      default to its container's mode. See enum for description of supported modes.
 */
