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
import {ensureUniqueBy, throwIf, debounced} from '@xh/hoist/utils/js';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {start} from '@xh/hoist/promise';
import {castArray, isEmpty, isString, isFunction} from 'lodash';

import {dashView} from './DashView';
import {DashViewModel} from './DashViewModel';
import {DashViewSpec} from './DashViewSpec';
import {convertGLToState, convertStateToGL, getViewModelId} from './impl/DashContainerUtils';

/**
 * Model for a DashContainer, representing its contents and layout state.
 *
 * This model provides support for managing dash views, adding new views on the fly,
 * and tracking / loading state.
 *
 * State should be structured as nested arrays of container objects, according to
 * GoldenLayout`s content config. Supported container types are `row`, `column` and `stack`.
 * Child containers and views should be provided as an array under the `contents` key.
 * Note that loading state will destroy and reinitialize all components. Therefore,
 * it is recommended you do so sparingly.
 *
 * We differ from GoldenLayouts by offering a new type `view`. These should be configured as
 * id references to the provided ViewSpec, e.g. {type: `view`, id: ViewSpec.id}. These should
 * be used instead of the `component` and `react-component` types provided by GoldenLayouts.
 *
 * e.g.
 *
 * [{
 *     type: 'row',
 *     contents: [
 *         {
 *             type: 'stack',
 *             contents: [
 *                 {type: 'view', id: 'viewId'},
 *                 {type: 'view', id: 'viewId'}
 *             ]
 *         },
 *         {
 *             type: 'column',
 *             contents: [
 *                 {type: 'view', id: 'viewId'}
 *             ]
 *         }
 *     ]
 * }]
 *
 * @see http://golden-layout.com/docs/ItemConfig.html
 * @see http://golden-layout.com/tutorials/getting-started-react.html
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
     * @param {boolean} [enableAdd] - true (default) to include a '+' button in each stack header,
     *      which opens the provided 'Add View' dialog.
     * @param {RenderMode} [renderMode] - strategy for rendering DashViews. Can be set
     *      per-view via `DashViewSpec.renderMode`. See enum for description of supported modes.
     * @param {RefreshMode} [refreshMode] - strategy for refreshing DashViews. Can be set
     *      per-view via `DashViewSpec.refreshMode`. See enum for description of supported modes.
     * @param {Object} [goldenLayoutSettings] - custom settings to be passed to the GoldenLayout instance.
     *      @see http://golden-layout.com/docs/Config.html
     * @param {DashContainerGetInitStateFn} [getInitState] - Function which returns initial state.
     * @param {DashViewSetStateFn} [setState] - Callback triggered when the state changes.
     */
    constructor({
        viewSpecs,
        defaultState,
        enableAdd = true,
        renderMode = RenderMode.LAZY,
        refreshMode = RefreshMode.ON_SHOW_LAZY,
        goldenLayoutSettings,
        getInitState,
        setState
    }) {
        throwIf(isEmpty(viewSpecs), 'A collection of DashViewSpecs are required');
        throwIf(isEmpty(defaultState), 'DashContainerModel must be initialized with default state');

        this.defaultState = castArray(defaultState);
        this.enableAdd = enableAdd;
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;
        this.goldenLayoutSettings = goldenLayoutSettings;
        this.getInitState = getInitState;
        this.setState = setState;

        // Add viewSpecs
        ensureUniqueBy(viewSpecs, 'id');
        this.viewSpecs = viewSpecs.map(cfg => new DashViewSpec(cfg));

        // Initialize GoldenLayouts with default state once ref is ready
        this.addReaction({
            when: () => this.containerRef.current,
            run: () => {
                const initState = isFunction(this.getInitState) ? this.getInitState() : null,
                    state = !isEmpty(initState) ? initState : defaultState;
                this.loadStateAsync(state);
            }
        });

        this.addReaction({
            track: () => this.viewState,
            run: () => this.updateState()
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
                this.updateState();
            });
            goldenLayout.on('itemDestroyed', item => this.onItemDestroyed(item));
            goldenLayout.on('stackCreated', stack => this.onStackCreated(stack));
            goldenLayout.init();
            this.goldenLayout = goldenLayout;

            this.refreshActiveTabs();
        }).linkTo(this.loadModel);
    }

    async resetStateAsync() {
        return this.loadStateAsync(this.defaultState);
    }

    @debounced(100)
    @action
    updateState() {
        const {goldenLayout, viewState} = this;
        if (!goldenLayout.isInitialised) return;

        const configItems = goldenLayout.toConfig().content,
            contentItems = goldenLayout.root.contentItems;

        this.state = convertGLToState(configItems, contentItems, viewState);

        if (isFunction(this.setState)) {
            this.setState(this.state);
        }
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

        const instances = this.getViewsBySpecId(viewSpec.id);
        throwIf(viewSpec.unique && instances.length, `Trying to add multiple instance of a Viewspec flagged "unique". id=${viewSpec.id}`);

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
            const $container = stack.header.controlsContainer, // Note: this is a jquery element
                icon = convertIconToSvg(Icon.add()),
                className = 'xh-dash-container-add-button';

            $container.append(`<div class="${className}">${icon}</div>`);
            const $btn = $container.find('.' + className);
            $btn.click(() => this.openViewDialog(stack));
        }
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
    // Active Tab
    //-----------------
    refreshActiveTabs() {
        if (!this.goldenLayout) return;
        const stacks = this.goldenLayout.root.getItemsByType('stack');
        stacks.forEach(stack => this.onStackActiveItemChange(stack));
    }

    onStackActiveItemChange(stack) {
        if (!this.goldenLayout) return;

        const views = stack.getItemsByType('component'),
            activeItem = stack.getActiveContentItem();

        views.forEach(view => {
            const id = getViewModelId(view),
                viewModel = this.getViewModel(id),
                isActive = view === activeItem;

            viewModel.setIsActive(isActive);
        });
    }

    //-----------------
    // Icons
    //-----------------
    renderIcons() {
        // For each view, insert icon in tab if required
        const views = this.getViews();
        views.forEach(view => {
            const id = view.config.component,
                $el = view.tab.element, // Note: this is a jquery element
                viewSpec = this.getViewSpec(id);

            if (viewSpec?.icon && !$el.find('svg.svg-inline--fa').length) {
                const iconSvg = convertIconToSvg(viewSpec.icon);
                $el.find('.lm_title').before(iconSvg);
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

/**
 * @callback DashContainerGetInitStateFn - Function which returns an object containing the
 *      DashContainers initial state. Called once during initialization
 * @returns {Object} - Observable state for the DashView
 */

/**
 * @callback DashViewSetStateFn - Callback triggered when the DashContainer's state changes.
 * @param {Object} state - Current state
 */