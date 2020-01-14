/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {GoldenLayout} from '@xh/hoist/kit/golden-layout';
import {RefreshMode, RenderMode} from '@xh/hoist/enums';
import {Icon, convertIconToSvg} from '@xh/hoist/icon';
import {createObservableRef} from '@xh/hoist/utils/react';
import {ensureUniqueBy, throwIf, debounced, withDefault} from '@xh/hoist/utils/js';
import {wait} from '@xh/hoist/promise';
import {isEmpty, isString} from 'lodash';

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

    /** member {boolean} */
    @observable loadingState;

    /** @member {DashViewSpec[]} */
    viewSpecs = [];

    /** @member {boolean} */
    enableAdd;

    /** @member {RenderMode} */
    renderMode;

    /** @member {RefreshMode} */
    refreshMode;

    /** @member {Object} */
    goldenLayoutSettings;

    /** @member {Ref} */
    containerRef = createObservableRef();

    /** member {ModelLookupContext} */
    modelLookupContext;

    /**
     * @param {DashViewSpec[]} viewSpecs - A collection of viewSpecs, each describing a type of view
     *      that can be displayed in this container
     * @param {Object[]} [initialState] - Default layout state for this container.
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
        initialState = [],
        enableAdd = true,
        renderMode = RenderMode.LAZY,
        refreshMode = RefreshMode.ON_SHOW_LAZY,
        goldenLayoutSettings
    }) {
        throwIf(isEmpty(viewSpecs), 'A collection of DashViewSpecs are required');

        this.enableAdd = enableAdd;
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;
        this.goldenLayoutSettings = goldenLayoutSettings;

        // Add viewSpecs
        ensureUniqueBy(viewSpecs, 'id');
        this.viewSpecs = viewSpecs.map(cfg => new DashViewSpec(cfg));

        // Initialize GoldenLayouts with initial state once ref is ready
        this.addReaction({
            when: () => this.containerRef.current,
            run: () => this.loadStateAsync(initialState)
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

        // Show mask to provide user feedback
        // Todo: Go back to PendingTaskModel, call it loadingState
        this.setLoadingState(true);
        await wait(100);

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
        goldenLayout.on('stateChanged', () => this.updateState());
        goldenLayout.on('itemDestroyed', item => this.onItemDestroyed(item));
        goldenLayout.on('stackCreated', stack => this.onStackCreated(stack));
        goldenLayout.init();
        this.goldenLayout = goldenLayout;

        this.refreshActiveTabs();
        this.updateTabHeaders();

        await wait(100);
        this.setLoadingState(false);
    }

    @action
    setLoadingState(val) {
        this.loadingState = val;
    }

    @debounced(100)
    @action
    updateState() {
        const {goldenLayout, viewState} = this;
        if (!goldenLayout.isInitialised) return;

        this.state = convertGLToState(goldenLayout, viewState);

        // We must update the tab headers, both because changes to
        // GoldenLayout can cause them to be dropped, and to reflect
        // title/icon changes in view state
        this.updateTabHeaders();
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
        const viewModel = this.getViewModel(id);
        XH.safeDestroy(viewModel);
        this.viewModels = this.viewModels.filter(it => it.id !== id);
    }

    getViewModelId(view) {
        if (!view || !view.isInitialised || !view.isComponent) return;
        return view.instance?._reactComponent?.props?.id;
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

            if (viewModel) viewModel.setIsActive(isActive);
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
                viewModelId = this.getViewModelId(view),
                state = this.viewState[viewModelId],
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
        this.destroyGoldenLayouts();
    }

    destroyGoldenLayouts() {
        XH.safeDestroy(this.goldenLayout);
        XH.safeDestroy(this.viewModels);
    }

}
