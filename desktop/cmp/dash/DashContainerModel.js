/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed, RefreshMode, RenderMode} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {GoldenLayout} from '@xh/hoist/kit/golden-layout';
import {Icon, convertIconToSvg} from '@xh/hoist/icon';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {createObservableRef} from '@xh/hoist/utils/react';
import {ensureUniqueBy, throwIf, debounced, withDefault} from '@xh/hoist/utils/js';
import {start} from '@xh/hoist/promise';
import {isEmpty} from 'lodash';

import {DashViewSpec} from './DashViewSpec';
import {dashTab} from './impl/DashTab';
import {DashTabModel} from './impl/DashTabModel';
import {convertGLToState, convertStateToGL, getTabModelId} from './impl/DashContainerUtils';

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
 * We differ from GoldenLayout by offering a new type `view`. These should be configured as
 * id references to the provided DashViewSpec, e.g. {type: `view`, id: ViewSpec.id}. These should
 * be used instead of the `component` and `react-component` types provided by GoldenLayout.
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

    //------------------------
    // Observable API
    //------------------------
    /** @member {Object[]} */
    @observable.ref state;
    /** @member {GoldenLayout} */
    @observable.ref goldenLayout;

    //------------------------
    // Immutable public properties
    //------------------------
    /** @member {DashViewSpec[]} */
    viewSpecs = [];
    /** @member {boolean} */
    showAddButton;
    /** @member {RenderMode} */
    renderMode;
    /** @member {RefreshMode} */
    refreshMode;
    /** @member {Object} */
    goldenLayoutSettings;

    //------------------------
    // Implementation properties
    //------------------------
    @managed @observable.ref tabModels = [];
    @managed loadingStateTask = new PendingTaskModel();
    containerRef = createObservableRef();
    @observable dialogIsOpen;
    modelLookupContext;

    /**
     * @param {DashViewSpec[]} viewSpecs - A collection of viewSpecs, each describing a type of view
     *      that can be displayed in this container
     * @param {Object[]} [initialState] - Default layout state for this container.
     * @param {boolean} [showAddButton] - true (default) to include a '+' button in each stack header,
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
        initialState = [],
        showAddButton = true,
        renderMode = RenderMode.LAZY,
        refreshMode = RefreshMode.ON_SHOW_LAZY,
        goldenLayoutSettings
    }) {
        throwIf(isEmpty(viewSpecs), 'A collection of DashViewSpecs are required');

        this.showAddButton = showAddButton;
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;
        this.goldenLayoutSettings = goldenLayoutSettings;

        // Add DashViewSpecs
        ensureUniqueBy(viewSpecs, 'id');
        this.viewSpecs = viewSpecs.map(cfg => new DashViewSpec(cfg));

        // Initialize GoldenLayout with initial state once ref is ready
        this.addReaction({
            when: () => this.containerRef.current,
            run: () => this.loadStateAsync(initialState)
        });

        this.addReaction({
            track: () => this.viewState,
            run: () => this.updateState()
        });
    }

    /**
     * Load state into the DashContainer, recreating its layout and contents
     * @param {object} state - State to load
     */
    @action
    async loadStateAsync(state) {
        const containerEl = this.containerRef.current;
        if (!containerEl) return;

        // Show mask to provide user feedback
        return start(() => {
            this.destroyGoldenLayout();

            // Create new GoldenLayout instance with state
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
                        model = new DashTabModel({
                            id,
                            viewSpec,
                            state,
                            containerModel: this
                        });

                    this.addTabModel(model);
                    return dashTab({model, ...rest});
                });
            });

            // Initialize GoldenLayout
            goldenLayout.on('stateChanged', () => this.updateState());
            goldenLayout.on('itemDestroyed', item => this.onItemDestroyed(item));
            goldenLayout.on('stackCreated', stack => this.onStackCreated(stack));
            goldenLayout.init();
            this.goldenLayout = goldenLayout;

            this.refreshActiveTabs();
            this.updateTabHeaders();
        }).linkTo(this.loadingStateTask);
    }

    /**
     * Add a view to the container.
     *
     * @param {string} id - DashViewSpec id to add to the container
     * @param {object} container - GoldenLayout container to add it to. If not provided, will be added to the root container.
     */
    addView(id, container) {
        const {goldenLayout} = this;
        if (!goldenLayout) return;

        const viewSpec = this.getViewSpec(id),
            instances = this.getViewsBySpecId(id);

        throwIf(!viewSpec, `Trying to add unknown DashViewSpec. id=${id}`);
        throwIf(viewSpec.unique && instances.length, `Trying to add multiple instance of a DashViewSpec flagged "unique". id=${id}`);

        if (!container) container = goldenLayout.root.contentItems[0];
        container.addChild(viewSpec.goldenLayoutConfig);
    }

    //------------------------
    // Implementation
    //------------------------
    @debounced(100)
    @action
    updateState() {
        const {goldenLayout, viewState} = this;
        if (!goldenLayout.isInitialised) return;

        this.state = convertGLToState(goldenLayout, viewState);

        // We must update the tab headers on state change to
        // reflect title/icon changes in view state
        this.updateTabHeaders();
    }

    onItemDestroyed(item) {
        if (!item.isComponent) return;
        const id = getTabModelId(item);
        if (id) this.removeTabModel(id);
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
     * Get all view instances currently rendered in the container
     */
    getViews() {
        const {goldenLayout} = this;
        if (!goldenLayout) return [];
        return goldenLayout.root.getItemsByType('component');
    }

    /**
     * Get all view instances with a given DashViewSpec.id
     */
    getViewsBySpecId(id) {
        return this.getViews().filter(it => it.config.component === id);
    }

    get viewState() {
        const ret = {};
        this.tabModels.map(it => {
            const state = it.getState();
            if (state) ret[it.id] = state;
        });
        return ret;
    }

    //-----------------
    // Tabs
    //-----------------
    getTabModel(id) {
        return this.tabModels.find(it => it.id === id);
    }

    @action
    addTabModel(tabModel) {
        this.tabModels = [...this.tabModels, tabModel];
    }

    @action
    removeTabModel(id) {
        const tabModel = this.getTabModel(id);
        XH.safeDestroy(tabModel);
        this.tabModels = this.tabModels.filter(it => it.id !== id);
    }

    //-----------------
    // Add View Dialog
    //-----------------
    onStackCreated(stack) {
        // Listen to active item change to support RenderMode
        stack.on('activeContentItemChanged', () => this.onStackActiveItemChange(stack));

        // Add '+' icon and attach click listener for adding components
        if (this.showAddButton) {
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
        this._dialogSelectedContainer = stack;
        this.dialogIsOpen = true;
    }

    @action
    closeViewDialog() {
        this.dialogIsOpen = false;
    }

    submitViewDialog(id) {
        this.addView(id, this._dialogSelectedContainer);
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

        const tabs = stack.getItemsByType('component'),
            activeItem = stack.getActiveContentItem();

        tabs.forEach(view => {
            const id = getTabModelId(view),
                tabModel = this.getTabModel(id),
                isActive = view === activeItem;

            if (tabModel) tabModel.setIsActive(isActive);
        });
    }

    //-----------------
    // Tab Headers
    //-----------------
    updateTabHeaders() {
        const views = this.getViews();
        views.forEach(view => {
            const id = view.config.component,
                $el = view.tab.element, // Note: this is a jquery element
                viewSpec = this.getViewSpec(id),
                tabModelId = getTabModelId(view),
                state = this.viewState[tabModelId],
                icon = withDefault(state?.icon, viewSpec?.icon),
                title = withDefault(state?.title, viewSpec?.title);

            if (icon) {
                const $currentIcon = $el.find('svg.svg-inline--fa').first(),
                    currentIconType = $currentIcon ? $currentIcon?.data('icon') : null,
                    newIconType = icon.props.icon[1];

                if (currentIconType !== newIconType) {
                    const iconSvg = convertIconToSvg(icon);
                    $el.find('svg.svg-inline--fa').remove();
                    $el.find('.lm_title').before(iconSvg);
                }
            }

            if (title) {
                const $titleEl = $el.find('.lm_title').first(),
                    currentTitle = $titleEl.text();

                if (currentTitle !== title) {
                    $titleEl.text(title);
                }
            }
        });
    }

    //-----------------
    // Misc
    //-----------------
    destroy() {
        this.destroyGoldenLayout();
    }

    @action
    destroyGoldenLayout() {
        XH.safeDestroy(this.goldenLayout);
        XH.safeDestroy(this.tabModels);
        this.goldenLayout = null;
        this.tabModels = [];
    }

}
