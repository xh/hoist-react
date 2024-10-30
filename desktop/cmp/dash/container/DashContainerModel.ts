/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {
    managed,
    modelLookupContextProvider,
    Persistable,
    PersistableState,
    PersistenceProvider,
    PlainObject,
    RefreshMode,
    RenderMode,
    TaskObserver,
    XH
} from '@xh/hoist/core';
import {convertIconToHtml, deserializeIcon} from '@xh/hoist/icon';
import {showContextMenu} from '@xh/hoist/kit/blueprint';
import {GoldenLayout} from '@xh/hoist/kit/golden-layout';
import {action, bindable, makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {isOmitted} from '@xh/hoist/utils/impl';
import {debounced, ensureUniqueBy, throwIf} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {cloneDeep, defaultsDeep, find, isFinite, isNil, last, reject, startCase} from 'lodash';
import {createRoot} from 'react-dom/client';
import {DashConfig, DashModel} from '../';
import {DashViewModel, DashViewState} from '../DashViewModel';
import {DashContainerViewSpec} from './DashContainerViewSpec';
import {dashContainerContextMenu} from './impl/DashContainerContextMenu';
import {dashContainerMenuButton} from './impl/DashContainerMenuButton';
import {
    convertGLToState,
    convertStateToGL,
    getViewModelId,
    goldenLayoutConfig
} from './impl/DashContainerUtils';
import {dashContainerView} from './impl/DashContainerView';

export interface DashContainerConfig extends DashConfig<DashContainerViewSpec, DashViewState> {
    /** Strategy for rendering DashContainerViews. Can also be set per-view in `viewSpecs`*/
    renderMode?: RenderMode;

    /** Strategy for refreshing DashContainerViews. Can also be set per-view in `viewSpecs`*/
    refreshMode?: RefreshMode;

    /** True to include a button in each stack header showing the dash context menu. */
    showMenuButton?: boolean;

    /** Between items in pixels. */
    margin?: number;

    /**
     * Custom settings to be passed to the GoldenLayout instance.
     * @see http://golden-layout.com/docs/Config.html
     */
    goldenLayoutSettings?: PlainObject;
}

/**
 * Model for a DashContainer, representing its contents and layout state.
 *
 * This model provides support for managing dash views, adding new views on the fly,
 * and tracking / loading state.
 *
 * State should be structured as nested arrays of container objects, according to
 * GoldenLayout's content config. Supported container types are `row`, `column` and `stack`.
 * Child containers and views should be provided as an array under the `contents` key.
 *
 *      + `row` lay out its children horizontally.
 *      + `column` lays out its children vertically.
 *      + `stack` lays out its children as tabs. `stacks` can only contain `views` (more below)
 *
 * The children of `row` and `column` containers can be sized by providing width or height values.
 * Numeric values represent relative sizes, expressed as a percentage of the available space.
 * Pixel values can be provided as a string (e.g. '100px'), which will be converted to a relative
 * size at parse time. Any unaccounted for space will be divided equally across the remaining children.
 *
 * We differ from GoldenLayout by offering a new type `view`. These should be configured as
 * id references to the provided DashContainerViewSpec, e.g. `{type: `view`, id: ViewSpec.id}`.
 * Use instead of the `component` and `react-component` types provided by GoldenLayout.
 *
 * Note that loading state will destroy and reinitialize all components - do so sparingly!
 *
 * @example
 * ```
 * [{
 *     type: 'row',
 *     contents: [
 *          // The first child of this row has pixel width of '200px'.
 *          // The column will take the remaining width.
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
 *                 // Relative height of 40%. The remaining 60% will be split equally by the other views.
 *                 {type: 'view', id: 'viewId', height: 40},
 *                 {type: 'view', id: 'viewId'},
 *                 {type: 'view', id: 'viewId'}
 *             ]
 *         }
 *     ]
 * }]
 * ```
 *
 * @see http://golden-layout.com/docs/ItemConfig.html
 * @see http://golden-layout.com/tutorials/getting-started-react.html
 */
export class DashContainerModel
    extends DashModel<DashContainerViewSpec, DashViewState, DashViewModel>
    implements Persistable<{state: DashViewState[]}>
{
    //---------------------
    // Settable State
    //----------------------
    @bindable showMenuButton: boolean;

    //-----------------------------
    // Public properties
    //-----------------------------
    renderMode: RenderMode;
    refreshMode: RefreshMode;
    goldenLayoutSettings: PlainObject;
    margin: number;

    get isEmpty(): boolean {
        return this.goldenLayout && this.viewModels.length === 0;
    }

    //---------------------------
    // Implementation properties
    //----------------------------
    @observable.ref goldenLayout: GoldenLayout;
    containerRef = createObservableRef<HTMLElement>();
    modelLookupContext;
    @managed loadingStateTask = TaskObserver.trackLast();

    constructor({
        viewSpecs,
        viewSpecDefaults,
        initialState = [],
        renderMode = 'lazy',
        refreshMode = 'onShowLazy',
        layoutLocked = false,
        contentLocked = false,
        renameLocked = false,
        showMenuButton = false,
        margin = 6,
        goldenLayoutSettings,
        persistWith = null,
        emptyText = 'No views have been added to the container.',
        addViewButtonText = 'Add View',
        extraMenuItems
    }: DashContainerConfig) {
        super();
        makeObservable(this);
        viewSpecs = viewSpecs.filter(it => !isOmitted(it));
        ensureUniqueBy(viewSpecs, 'id');
        this.viewSpecs = viewSpecs.map(cfg => {
            return defaultsDeep({}, cfg, viewSpecDefaults, {
                title: startCase(cfg.id),
                omit: false,
                unique: false,
                allowAdd: true,
                allowRemove: true,
                allowRename: true
            });
        });

        this.restoreState = {initialState, layoutLocked, contentLocked, renameLocked};
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;
        this.layoutLocked = layoutLocked;
        this.contentLocked = contentLocked;
        this.renameLocked = renameLocked;
        this.showMenuButton = showMenuButton;
        this.margin = margin;
        this.goldenLayoutSettings = goldenLayoutSettings;
        this.emptyText = emptyText;
        this.addViewButtonText = addViewButtonText;
        this.extraMenuItems = extraMenuItems;
        this.state = initialState;

        if (persistWith) {
            PersistenceProvider.create({
                persistOptions: {
                    path: 'dashContainer',
                    ...persistWith
                },
                target: this
            });
        }

        // Initialize GoldenLayout with initial state once ref is ready
        this.addReaction(
            {
                track: () => [this.containerRef.current, this.layoutLocked],
                run: () => this.loadStateAsync(this.state)
            },
            {
                track: () => this.viewState,
                run: () => this.updateState()
            }
        );
    }

    /**
     * Restore the initial state as specified by the application at construction time. This is the
     * state without any persisted state or user changes applied.
     *
     * This method will clear the persistent state saved for this component, if any.
     */
    @action
    async restoreDefaultsAsync() {
        const {restoreState} = this;
        this.layoutLocked = restoreState.layoutLocked;
        this.contentLocked = restoreState.contentLocked;
        this.renameLocked = restoreState.renameLocked;
        await this.loadStateAsync(restoreState.initialState);
    }

    /**
     * Load state into the DashContainer, recreating its layout and contents
     * @param state - State to load
     */
    async loadStateAsync(state) {
        const containerEl = this.containerRef.current;
        if (!containerEl) {
            this.logWarn(
                'DashboardContainer not yet rendered - cannot update state - change will be discarded!'
            );
            return;
        }

        // Show mask to provide user feedback
        return wait()
            .thenAction(() => {
                this.destroyGoldenLayout();
                this.goldenLayout = this.createGoldenLayout(containerEl, state);
            })
            .wait(500)
            .then(() => {
                // Since React v18, it's necessary to wait a short while for ViewModels to be available.
                this.refreshActiveViews();
                this.updateTabHeaders();
            })
            .linkTo(this.loadingStateTask);
    }

    /**
     * Add a view to the container.
     *
     * @param specId - DashContainerViewSpec id to add to the container
     * @param container - GoldenLayout container to add it to. If not provided, will be added to the root container.
     * @param index - An optional index that determines at which position the new item should be added.
     */
    addView(specId: string, container?: any, index?: number) {
        const {goldenLayout} = this;
        if (!goldenLayout) return;

        const viewSpec = this.getViewSpec(specId),
            instances = this.getItemsBySpecId(specId);

        throwIf(
            !viewSpec,
            `Trying to add non-existent or omitted DashContainerViewSpec. specId=${specId}`
        );
        throwIf(
            !viewSpec.allowAdd,
            `Trying to add DashContainerViewSpec with allowAdd=false. specId=${specId}`
        );
        throwIf(
            viewSpec.unique && instances.length,
            `Trying to add multiple instances of a DashContainerViewSpec with unique=true. specId=${specId}`
        );

        if (!container) container = goldenLayout.root.contentItems[0];

        if (!isFinite(index)) index = container.contentItems.length;
        container.addChild(goldenLayoutConfig(viewSpec), index);
        const stack = container.isStack ? container : last(container.contentItems);
        wait(1).then(() => this.onStackActiveItemChange(stack));
    }

    /**
     * Remove a view from the container.
     * @param id - DashViewModel id to remove from the container
     */
    removeView(id: string) {
        const view = this.getItemByViewModel(id);
        if (!view) return;
        view.parent.removeChild(view);
    }

    /**
     * Initiate field renaming for a given view
     * @param id - DashViewModel id to rename
     */
    renameView(id: string) {
        const view = this.getItemByViewModel(id);
        if (!view) return;
        this.showTitleForm(view.tab.element);
    }

    onResize() {
        this.goldenLayout?.updateSize();
    }

    //------------------------
    // Persistable Interface
    //------------------------
    getPersistableState(): PersistableState<{state: DashViewState[]}> {
        return new PersistableState({state: this.state});
    }

    setPersistableState(persistableState: PersistableState<{state: DashViewState[]}>) {
        const {state} = persistableState.value;
        if (!state) return;
        if (this.containerRef.current) {
            this.loadStateAsync(state);
        } else {
            // If the container is not yet rendered, store the state directly
            this.state = state;
        }
    }

    //------------------------
    // Implementation
    //------------------------
    private updateState() {
        const {goldenLayout, containerRef} = this;
        if (!goldenLayout?.isInitialised || !containerRef.current) return;

        // If the layout becomes completely empty, ensure we have our minimal empty layout
        if (!goldenLayout.root.contentItems.length) {
            this.loadStateAsync([]);
            return;
        }

        this.updateTabHeaders();
        this.publishState();
    }

    @debounced(1000)
    private publishState() {
        const {goldenLayout} = this;
        if (!goldenLayout) return;
        runInAction(() => {
            this.state = convertGLToState(goldenLayout, this);
        });
    }

    private onItemDestroyed(item) {
        if (!item.isComponent) return;
        const id = getViewModelId(item);
        if (id) this.removeViewModel(id);
    }

    private getViewSpec(id: string) {
        return this.viewSpecs.find(it => it.id === id);
    }

    //-----------------
    // Items
    //-----------------
    // Get all items currently rendered in the container
    private getItems() {
        const {goldenLayout} = this;
        if (!goldenLayout) return [];
        return goldenLayout.root.getItemsByType('component');
    }

    // Get all view instances with a given DashViewSpec.id
    private getItemsBySpecId(id: string) {
        return this.getItems().filter(it => it.config.component === id);
    }

    // Get the view instance with the given DashViewModel.id
    private getItemByViewModel(id: string) {
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

    private getViewModel(id: string) {
        return find(this.viewModels, {id});
    }

    @action
    private addViewModel(viewModel: DashViewModel) {
        this.viewModels = [...this.viewModels, viewModel];
    }

    @action
    private removeViewModel(id: string) {
        const viewModel = this.getViewModel(id);
        XH.safeDestroy(viewModel);
        this.viewModels = reject(this.viewModels, {id});
    }

    //-----------------
    // Context Menu
    //-----------------
    private onStackCreated(stack) {
        // Listen to active item change to support RenderMode
        stack.on('activeContentItemChanged', () => this.onStackActiveItemChange(stack));

        // Add menu button to stack header, being sure to preserve any controls that GL has installed
        const controlsContainerEl = stack.header.controlsContainer[0],
            menuContainerEl = document.createElement('div');

        controlsContainerEl.appendChild(menuContainerEl);

        const menuRoot = createRoot(menuContainerEl);
        menuRoot.render(dashContainerMenuButton({dashContainerModel: this, stack}));

        // Add context menu listener for adding components
        const $el = stack.header.element;
        $el.off('contextmenu').contextmenu(e => {
            this.showContextMenu(e, $el, stack);
            return false;
        });
    }

    private showContextMenu(
        e: MouseEvent,
        $target: any,
        stack: any,
        viewModel?: DashViewModel,
        index?: number
    ) {
        if (this.contentLocked) return;

        // If event does not contain co-ordinates, fallback to showing context menu below target
        let offset = {left: e.clientX, top: e.clientY};
        if (isNil(offset.left) || isNil(offset.top)) {
            offset = $target.offset();
            offset.top += 30;
        }

        const menu = dashContainerContextMenu({
            stack,
            viewModel,
            index,
            dashContainerModel: this
        });

        showContextMenu(menu, offset);
    }

    //-----------------
    // Active View
    //-----------------
    private refreshActiveViews() {
        if (!this.goldenLayout) return;
        const stacks = this.goldenLayout.root.getItemsByType('stack');
        stacks.forEach(stack => this.onStackActiveItemChange(stack));
    }

    private onStackActiveItemChange(stack: any) {
        if (!this.goldenLayout) return;

        const items = stack.getItemsByType('component'),
            activeItem = stack.getActiveContentItem();

        items.forEach(item => {
            const id = getViewModelId(item),
                viewModel = this.getViewModel(id),
                isActive = item === activeItem;

            if (viewModel) viewModel.isActive = isActive;
        });
    }

    //-----------------
    // Tab Headers
    //-----------------
    private updateTabHeaders() {
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
                this.showContextMenu(e, $el, stack, viewModel, index);
                return false;
            });

            if (icon) {
                const $currentIcon = $el.find(iconSelector).first(),
                    currentIconType = $currentIcon ? $currentIcon?.data('icon') : null,
                    newIconType = icon.props.iconName;

                if (currentIconType !== newIconType) {
                    const iconSvg = convertIconToHtml(icon);
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

    private insertTitleForm($el, viewModel: DashViewModel) {
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
                viewModel.title = title;
            }

            this.hideTitleForm($el);
            return false;
        });
    }

    private showTitleForm($tabEl) {
        if (this.renameLocked) return;

        const $titleEl = $tabEl.find('.lm_title').first(),
            $inputEl = $tabEl.find('.title-form input').first(),
            currentTitle = $titleEl.text();

        $tabEl.addClass('show-title-form');
        $inputEl.val(currentTitle);
        $inputEl.focus().select();
    }

    private hideTitleForm($tabEl) {
        $tabEl.removeClass('show-title-form');
    }

    //-----------------
    // Misc
    //-----------------
    private createGoldenLayout(containerEl: HTMLElement, state: any): GoldenLayout {
        const {viewSpecs} = this,
            ret = new GoldenLayout(
                {
                    content: convertStateToGL(cloneDeep(state), this),
                    settings: {
                        // Remove icons by default
                        showPopoutIcon: false,
                        showMaximiseIcon: false,
                        showCloseIcon: false,

                        // Respect layoutLocked
                        reorderEnabled: !this.layoutLocked,

                        ...this.goldenLayoutSettings
                    },
                    dimensions: {
                        borderWidth: this.margin,
                        headerHeight: 25
                    }
                },
                containerEl
            );

        // Register components
        viewSpecs.forEach(viewSpec => {
            ret.registerComponent(viewSpec.id, data => {
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
                return modelLookupContextProvider({
                    value: this.modelLookupContext,
                    item: dashContainerView({model})
                });
            });
        });

        ret.on('stateChanged', () => this.updateState());
        ret.on('itemDestroyed', item => this.onItemDestroyed(item));
        ret.on('stackCreated', stack => this.onStackCreated(stack));
        ret.init();
        return ret;
    }

    @action
    private destroyGoldenLayout() {
        XH.safeDestroy(this.goldenLayout);
        XH.safeDestroy(this.viewModels);
        this.goldenLayout = null;
        this.viewModels = [];
    }

    override destroy() {
        this.destroyGoldenLayout();
        super.destroy();
    }
}
