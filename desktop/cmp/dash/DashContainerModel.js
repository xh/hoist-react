/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {GoldenLayout} from '@xh/hoist/kit/golden-layout';
import {RefreshMode, RenderMode} from '@xh/hoist/enums';
import {Icon, convertIconToSvg} from '@xh/hoist/icon';
import {createObservableRef} from '@xh/hoist/utils/react';
import {ensureUniqueBy, throwIf} from '@xh/hoist/utils/js';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {start, wait} from '@xh/hoist/promise';
import {castArray, debounce, isEmpty, isEqual, isString} from 'lodash';

import {dashView} from './DashView';
import {DashViewModel} from './DashViewModel';
import {DashViewSpec} from './DashViewSpec';
import {convertGLToState, convertStateToGL, getViewModelId} from './impl/DashContainerUtils';

/**
 * Model for a DashContainer, representing its contents and layout state.
 *
 * Note that loading state will destroy and reinitialize all components. Therefore,
 * it is recommended you do so sparingly.
 *
 * Todo: Document how to structure state
 *
 * This object provides support for managing dash views, adding new views on the fly,
 * and tracking / loading state.
 */
@HoistModel
export class DashContainerModel {

    /** @member {Object[]} */
    @observable.ref state;

    /** @member {DashViewModel[]} */
    @observable.ref viewModels = [];

    /** @member {GoldenLayout} */
    @observable.ref goldenLayout;

    /** member {boolean} */
    @observable dialogIsOpen;

    /** @member {DashViewSpec[]} */
    viewSpecs = [];

    /** @member {Object} */
    defaultState;

    /** @member {Object} */
    goldenLayoutSettings;

    /** @member {boolean} */
    enableAdd;

    /** @member {RenderMode} */
    renderMode;

    /** @member {RefreshMode} */
    refreshMode;

    /** @member {Ref} */
    containerRef = createObservableRef();

    /** member {ModelLookupContext} */
    modelLookupContext;

    @managed
    loadModel = new PendingTaskModel();

    /**
     * @param {DashViewSpec[]} viewSpecs - A collection of viewSpecs, each describing a type of view
     *      that can be displayed in this container
     * @param {Object[]} defaultState - Default layout state for this container.
     * @param {Object[]} [initState] - State with which to initialize for this container,
     *      if different from defaultState.
     * @param {boolean} [enableAdd] - true (default) to include a '+' button in each stack header,
     *      which opens the provided 'Add View' dialog.
     * @param {RenderMode} [renderMode] - strategy for rendering DashViews. Can be set
     *      per-view via `DashViewSpec.renderMode`. See enum for description of supported modes.
     * @param {RefreshMode} [refreshMode] - strategy for refreshing DashViews. Can be set
     *      per-view via `DashViewSpec.refreshMode`. See enum for description of supported modes.
     * @param {Object} [goldenLayoutSettings] - custom settings to be passed to the GoldenLayout instance.
     *      @see http://golden-layout.com/docs/Config.html
     */
    constructor({
        viewSpecs,
        defaultState,
        initState,
        enableAdd = true,
        renderMode = RenderMode.LAZY,
        refreshMode = RefreshMode.ON_SHOW_LAZY,
        goldenLayoutSettings
    }) {
        throwIf(isEmpty(viewSpecs), 'A collection of DashViewSpecs are required');
        throwIf(isEmpty(defaultState), 'DashContainerModel must be initialized with default state');

        this.defaultState = castArray(defaultState);
        this.enableAdd = enableAdd;
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;
        this.goldenLayoutSettings = goldenLayoutSettings;

        // Add viewSpecs
        ensureUniqueBy(viewSpecs, 'id');
        this.viewSpecs = viewSpecs.map(cfg => new DashViewSpec(cfg));

        // Initialize GoldenLayouts with default state once ref is ready
        this.addReaction({
            when: () => this.containerRef.current,
            run: () => {
                const state = !isEmpty(initState) && !isEqual(initState, defaultState) ? initState : defaultState;
                this.loadStateAsync(state);
            }
        });

        this.updateStateBuffered = debounce(this.updateState, 100);
        this.addReaction({
            track: () => this.viewState,
            run: () => this.updateStateBuffered()
        });
    }

    @action
    async loadStateAsync(state) {
        const containerEl = this.containerRef.current;
        if (!containerEl) return;

        return start(() => {
            this.destroyGoldenLayouts();
            this.goldenLayout = null;

            // Recreate GoldenLayouts with state
            const goldenLayout = new GoldenLayout({
                content: convertStateToGL(state, this.viewSpecs),
                settings: {
                    // Remove icons by default
                    showPopoutIcon: false,
                    showMaximiseIcon: false,
                    showCloseIcon: false,
                    ...this.goldenLayoutSettings
                },
                dimensions: {
                    borderWidth: 6,
                    headerHeight: 25
                }
            }, containerEl);

            // Register components
            this.viewSpecs.forEach(viewSpec => {
                goldenLayout.registerComponent(viewSpec.id, (props) => {
                    const {id, state, ...rest} = props,
                        model = new DashViewModel({
                            id,
                            viewSpec,
                            state,
                            containerModel: this
                        });

                    this.addViewModel(model);
                    return dashView({model, ...rest});
                });
            });

            // Initialize GoldenLayout
            goldenLayout.on('stateChanged', () => {
                this.renderIcons();
                this.updateStateBuffered();
            });
            goldenLayout.on('itemDestroyed', item => this.onItemDestroyed(item));
            goldenLayout.on('stackCreated', stack => this.onStackCreated(stack));
            goldenLayout.init();

            this.goldenLayout = goldenLayout;
        }).linkTo(this.loadModel);
    }

    async resetStateAsync() {
        return this.loadStateAsync(this.defaultState);
    }

    // Todo: Try debounced again - maybe different order
    @action
    updateState() {
        const {goldenLayout, viewState} = this;
        if (!goldenLayout.isInitialised) return;

        const configItems = goldenLayout.toConfig().content,
            contentItems = goldenLayout.root.contentItems;

        this.state = convertGLToState(configItems, contentItems, viewState);
    }

    onItemDestroyed(item) {
        if (!item.isComponent) return;
        const id = getViewModelId(item);
        if (id) this.removeViewModel(id);
    }

    onResize() {
        this.goldenLayout.updateSize();
    }

    setModelLookupContext(modelLookupContext) {
        this.modelLookupContext = modelLookupContext;
    }

    getViewSpec(id) {
        return this.viewSpecs.find(it => it.id === id);
    }

    //-----------------
    // Views
    //-----------------
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

        container.addChild(viewSpec.goldenLayoutsConfig);
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

    //-----------------
    // View Models
    //-----------------
    get viewState() {
        const ret = {};
        this.viewModels.map(it => {
            const {id, state} = it;
            if (state) ret[id] = state;
        });
        return ret;
    }

    getViewModel(id) {
        return this.viewModels.find(it => it.id === id);
    }

    @action
    addViewModel(viewModel) {
        this.viewModels = [...this.viewModels, viewModel];
    }

    @action
    removeViewModel(id) {
        this.viewModels = this.viewModels.filter(it => it.id !== id);
    }

    //-----------------
    // Add View Dialog
    //-----------------
    onStackCreated(stack) {
        // Listen to active item change to support RenderMode
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
        if (!this.goldenLayout?.isInitialised) {
            // We must wait a tick on first occurrence to ensure elements are rendered
            await wait(100);
        }

        const views = stack.getItemsByType('component'),
            activeItem = stack.getActiveContentItem();

        views.forEach(view => {
            const id = getViewModelId(view),
                viewModel = this.getViewModel(id),
                isActive = view === activeItem;

            viewModel.setIsActive(isActive);
        });
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

    //-----------------
    // Misc
    //-----------------
    destroy() {
        this.destroyGoldenLayouts();
    }

    destroyGoldenLayouts() {
        if (!this.goldenLayout) return;
        this.goldenLayout.destroy();
    }

}
