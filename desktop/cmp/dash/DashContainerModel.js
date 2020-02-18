/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed, RefreshMode, RenderMode} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {GoldenLayout} from '@xh/hoist/kit/golden-layout';
import {convertIconToSvg, deserializeIcon} from '@xh/hoist/icon';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {createObservableRef} from '@xh/hoist/utils/react';
import {ensureUniqueBy, throwIf, debounced} from '@xh/hoist/utils/js';
import {start} from '@xh/hoist/promise';
import {ContextMenu} from '@xh/hoist/kit/blueprint';
import {find, reject, cloneDeep, isFinite} from 'lodash';

import {DashViewSpec} from './DashViewSpec';
import {dashView} from './impl/DashView';
import {DashViewModel} from './DashViewModel';
import {dashContainerContextMenu} from './impl/DashContainerContextMenu';
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
 *             width: '200px',
 *             contents: [
 *                 {type: 'view', id: 'viewId'},
 *                 {type: 'view', id: 'viewId'}
 *             ]
 *         },
 *         {
 *             type: 'column',
 *             contents: [
 *                 {type: 'view', id: 'viewId', height: 40},
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
    /** @member {DashViewModel[]} */
    @managed @observable.ref viewModels = [];


    //------------------------
    // Immutable public properties
    //------------------------
    /** @member {DashViewSpec[]} */
    viewSpecs = [];
    /** @member {RenderMode} */
    renderMode;
    /** @member {RefreshMode} */
    refreshMode;
    /** @member {Object} */
    goldenLayoutSettings;

    //------------------------
    // Implementation properties
    //------------------------
    @managed loadingStateTask = new PendingTaskModel();
    containerRef = createObservableRef();
    modelLookupContext;

    /**
     * @param {DashViewSpec[]} viewSpecs - A collection of viewSpecs, each describing a type of view
     *      that can be displayed in this container
     * @param {Object[]} [initialState] - Default layout state for this container.
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
        renderMode = RenderMode.LAZY,
        refreshMode = RefreshMode.ON_SHOW_LAZY,
        goldenLayoutSettings
    }) {
        viewSpecs = viewSpecs.filter(it => !it.omit);
        ensureUniqueBy(viewSpecs, 'id');
        this.viewSpecs = viewSpecs.map(cfg => new DashViewSpec(cfg));

        this.state = initialState;
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;
        this.goldenLayoutSettings = goldenLayoutSettings;

        // Initialize GoldenLayout with initial state once ref is ready
        this.addReaction({
            track: () => this.containerRef.current,
            run: () => this.loadStateAsync(this.state)
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
    async loadStateAsync(state) {
        const containerEl = this.containerRef.current;
        if (!containerEl) return;

        // Show mask to provide user feedback
        return start().thenAction(() => {
            this.destroyGoldenLayout();
            this.goldenLayout = this.createGoldenLayout(containerEl, state);

            this.refreshActiveViews();
            this.updateTabHeaders();
        }).linkTo(this.loadingStateTask);
    }

    /**
     * Add a view to the container.
     *
     * @param {string} id - DashViewSpec id to add to the container
     * @param {object} container - GoldenLayout container to add it to. If not provided, will be added to the root container.
     * @param {number} [index] - An optional index that determines at which position the new item should be added.
     */
    addView(id, container, index) {
        const {goldenLayout} = this;
        if (!goldenLayout) return;

        const viewSpec = this.getViewSpec(id),
            instances = this.getItemsBySpecId(id);

        throwIf(!viewSpec, `Trying to add non-existent or omitted DashViewSpec. id=${id}`);
        throwIf(!viewSpec.allowAdd, `Trying to add DashViewSpec with allowAdd=false. id=${id}`);
        throwIf(viewSpec.unique && instances.length, `Trying to add multiple instances of a DashViewSpec with unique=true. id=${id}`);

        if (!container) container = goldenLayout.root.contentItems[0];

        if (!isFinite(index)) index = container.contentItems.length;
        container.addChild(viewSpec.goldenLayoutConfig, index);
    }

    /**
     * Remove a view from the container.
     * @param {string} id - DashViewModel id to remove from the container
     */
    removeView(id) {
        const view = this.getItemByViewModel(id);
        if (!view) return;
        view.parent.removeChild(view);
    }

    /**
     * Enable the rename field for a given view
     * @param {string} id - DashViewModel id to rename
     */
    renameView(id) {
        const view = this.getItemByViewModel(id);
        if (!view) return;
        this.showTitleForm(view.tab.element);
    }

    //------------------------
    // Implementation
    //------------------------
    updateState() {
        const {goldenLayout, containerRef} = this;
        if (!goldenLayout.isInitialised || !containerRef.current) return;

        // If the layout becomes completely empty, ensure we have our minimal empty layout
        if (!goldenLayout.root.contentItems.length) {
            this.loadStateAsync([]);
            return;
        }

        this.updateTabHeaders();
        this.publishState();
    }

    @debounced(1000)
    @action
    publishState() {
        const {goldenLayout} = this;
        this.state = convertGLToState(goldenLayout, this);
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
    // Items
    //-----------------
    // Get all items currently rendered in the container
    getItems() {
        const {goldenLayout} = this;
        if (!goldenLayout) return [];
        return goldenLayout.root.getItemsByType('component');
    }

    // Get all view instances with a given DashViewSpec.id
    getItemsBySpecId(id) {
        return this.getItems().filter(it => it.config.component === id);
    }

    // Get the view instance with the given DashViewModel.id
    getItemByViewModel(id) {
        return this.getItems().find(it => it.instance?._reactComponent?.props?.id === id);
    }

    //-----------------
    // Views
    //-----------------
    get viewState() {
        const ret = {};
        this.viewModels.map(({id, icon, title, viewState}) => {
            ret[id] = {icon, title, viewState};
        });
        return ret;
    }

    getViewModel(id) {
        return find(this.viewModels, {id});
    }

    @action
    addViewModel(viewModel) {
        this.viewModels = [...this.viewModels, viewModel];
    }

    @action
    removeViewModel(id) {
        const viewModel = this.getViewModel(id);
        XH.safeDestroy(viewModel);
        this.viewModels = reject(this.viewModels, {id});
    }

    //-----------------
    // Context Menu
    //-----------------
    onStackCreated(stack) {
        // Listen to active item change to support RenderMode
        stack.on('activeContentItemChanged', () => this.onStackActiveItemChange(stack));

        // Add context menu listener for adding components
        const $el = stack.header.element;
        $el.off('contextmenu').contextmenu(e => {
            this.showContextMenu(e, {stack});
            return false;
        });
    }

    showContextMenu(e, {stack, viewModel, index}) {
        const offset = {left: e.clientX, top: e.clientY},
            menu = dashContainerContextMenu({
                stack,
                viewModel,
                index,
                dashContainerModel: this
            });

        ContextMenu.show(menu, offset, null, XH.darkTheme);
    }

    //-----------------
    // Active View
    //-----------------
    refreshActiveViews() {
        if (!this.goldenLayout) return;
        const stacks = this.goldenLayout.root.getItemsByType('stack');
        stacks.forEach(stack => this.onStackActiveItemChange(stack));
    }

    onStackActiveItemChange(stack) {
        if (!this.goldenLayout) return;

        const items = stack.getItemsByType('component'),
            activeItem = stack.getActiveContentItem();

        items.forEach(item => {
            const id = getViewModelId(item),
                viewModel = this.getViewModel(id),
                isActive = item === activeItem;

            if (viewModel) viewModel.setIsActive(isActive);
        });
    }

    //-----------------
    // Tab Headers
    //-----------------
    updateTabHeaders() {
        const items = this.getItems();
        items.forEach(item => {
            const viewModel = this.getViewModel(getViewModelId(item));
            if (!viewModel) return;

            const $el = item.tab.element, // Note: this is a jquery element
                stack = item.parent,
                $titleEl = $el.find('.lm_title').first(),
                iconSelector = 'svg.svg-inline--fa',
                viewSpec = this.getViewSpec(item.config.component),
                {icon, title} = viewModel;

            $el.off('contextmenu').contextmenu(e => {
                const index = stack.contentItems.indexOf(item);
                this.showContextMenu(e, {stack, viewModel, index});
                return false;
            });

            if (icon) {
                const $currentIcon = $el.find(iconSelector).first(),
                    currentIconType = $currentIcon ? $currentIcon?.data('icon') : null,
                    newIconType = icon.props.icon[1];

                if (currentIconType !== newIconType) {
                    const iconSvg = convertIconToSvg(icon);
                    $el.find(iconSelector).remove();
                    $titleEl.before(iconSvg);
                }
            }

            if (title) {
                const currentTitle = $titleEl.text();
                if (currentTitle !== title) $titleEl.text(title);
            }

            if (viewSpec.allowRename) {
                this.insertTitleForm($el, viewModel);
                $titleEl.off('dblclick').dblclick(() => this.showTitleForm($el));
            }
        });
    }

    insertTitleForm($el, viewModel) {
        const formSelector = '.title-form';
        if ($el.find(formSelector).length) return;

        // Create and insert form
        const $titleEl = $el.find('.lm_title').first();
        $titleEl.after(`<form class="title-form"><input type="text"/></form>`);

        // Attach listeners
        const $formEl = $el.find(formSelector).first(),
            $inputEl = $formEl.find('input').first();

        $inputEl.blur(() => this.hideTitleForm($el));
        $formEl.submit(() => {
            const title = $inputEl.val();
            if (title.length) {
                $titleEl.text(title);
                viewModel.setTitle(title);
            }

            this.hideTitleForm($el);
            return false;
        });
    }

    showTitleForm($tabEl) {
        const $titleEl = $tabEl.find('.lm_title').first(),
            $inputEl = $tabEl.find('.title-form input').first(),
            currentTitle = $titleEl.text();

        $tabEl.addClass('show-title-form');
        $inputEl.val(currentTitle);
        $inputEl.focus().select();
    }

    hideTitleForm($tabEl) {
        $tabEl.removeClass('show-title-form');
    }

    //-----------------
    // Misc
    //-----------------
    createGoldenLayout(containerEl, state) {
        const {viewSpecs} = this,
            ret = new GoldenLayout({
                content: convertStateToGL(cloneDeep(state), this),
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
        viewSpecs.forEach(viewSpec => {
            ret.registerComponent(viewSpec.id, (data) => {
                const {id, title, viewState} = data;
                let icon = data.icon;
                if (icon) icon = deserializeIcon(icon);

                const model = new DashViewModel({
                    id,
                    viewSpec,
                    icon,
                    title,
                    viewState,
                    containerModel: this
                });

                this.addViewModel(model);
                return dashView({model});
            });
        });

        ret.on('stateChanged', () => this.updateState());
        ret.on('itemDestroyed', item => this.onItemDestroyed(item));
        ret.on('stackCreated', stack => this.onStackCreated(stack));
        ret.init();
        return ret;
    }

    @action
    destroyGoldenLayout() {
        XH.safeDestroy(this.goldenLayout);
        XH.safeDestroy(this.viewModels);
        this.goldenLayout = null;
        this.viewModels = [];
    }

    destroy() {
        this.destroyGoldenLayout();
    }
}
