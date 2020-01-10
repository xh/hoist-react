/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, observable, bindable} from '@xh/hoist/mobx';
import {GoldenLayout} from '@xh/hoist/kit/golden-layout';
import {DashRefreshMode, DashRenderMode, DashEvent} from '@xh/hoist/enums';
import {Icon, convertIconToSvg} from '@xh/hoist/icon';
import {createObservableRef} from '@xh/hoist/utils/react';
import {ensureUniqueBy, throwIf} from '@xh/hoist/utils/js';
import {wait} from '@xh/hoist/promise';
import {isPlainObject, isString, isArray, castArray} from 'lodash';

import {dashView} from './DashView';

/**
 * Model for a DashContainer, representing its layout and contents.
 *
 * This object provides support for managing dash views, adding new views on the fly,
 * and tracking / loading layout state.
 */
@HoistModel
export class DashContainerModel {

    /** @member {DashViewSpec[]} */
    @observable.ref viewSpecs = [];

    /** @member {GoldenLayout} */
    @observable.ref goldenLayout;

    /** member {ModelLookupContext} */
    @bindable.ref modelLookupContext;

    /** member {boolean} */
    @observable dialogIsOpen;

    /** @member {Ref} */
    containerRef = createObservableRef();

    /** @member {boolean} */
    enableAdd;

    /** @member {DashRenderMode} */
    renderMode;

    /** @member {DashRefreshMode} */
    refreshMode;

    /**
     * Todo: Finalise best config params
     *
     * @param {boolean} [c.enableAdd] - true (default) to include a '+' button in each stack header,
     *      which opens the provided 'Add View' dialog.
     * @param {DashRenderMode} [c.renderMode] - strategy for rendering DashViews. Can be set
     *      per-view via `DashViewSpec.renderMode`. See enum for description of supported modes.
     * @param {DashRefreshMode} [c.refreshMode] - strategy for refreshing DashViews. Can be set
     *      per-view via `DashViewSpec.refreshMode`. See enum for description of supported modes.
     */
    constructor({
        viewSpecs = [],
        layout,
        glSettings,
        enableAdd = true,
        renderMode = DashRenderMode.LAZY,
        refreshMode = DashRefreshMode.ON_SHOW_LAZY
    }) {
        this.enableAdd = enableAdd;
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;

        // Add viewSpecs
        ensureUniqueBy(viewSpecs, 'id');
        viewSpecs.forEach(viewSpec => this.addViewSpec(viewSpec));

        // Initialize GoldenLayouts once ref is ready
        this.addReaction({
            track: () => this.containerRef.current,
            run: () => this.initGoldenLayout({layout, glSettings})
        });

        this.addReaction({
            track: () => this.viewSpecs,
            run: () => this.registerComponents()
        });
    }

    //-----------------
    // Golden Layouts
    //-----------------
    @action
    initGoldenLayout({layout, glSettings}) {
        // Parse structure and apply settings
        this.goldenLayout = new GoldenLayout({
            content: this.parseLayoutConfig(castArray(layout)),
            settings: {
                // Remove icons by default
                showPopoutIcon: false,
                showMaximiseIcon: false,
                showCloseIcon: false,
                ...glSettings
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

        // Todo: Save copy of current state as 'Default state'
    }

    parseLayoutConfig(layout = []) {
        return layout.map(it => {
            if (isString(it)) {
                // Uses ViewSpec id shorthand
                const viewSpec = this.getViewSpec(it);
                return this.getGLConfig(viewSpec);
            } else if (isPlainObject(it) && isArray(it.content)) {
                // Is a container - ensure correctly configured and parse children
                const {type, content, ...rest} = it;

                throwIf(!['row', 'column', 'stack'].includes(type), 'Container type must either "row", "column" or "stack"');
                throwIf(!content.length, 'Container must contain at least one child');

                return {
                    type,
                    content: this.parseLayoutConfig(content),
                    ...rest
                };
            }

            // Otherwise, it may be a fully qualified component spec. Return as is.
            return it;
        });
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

    getGLConfig(viewSpec) {
        const {id, title, allowClose} = viewSpec;
        return {
            component: id,
            type: 'react-component',
            title,
            isClosable: allowClose
        };
    }

    /**
     * Add a DashView to the layout.
     *
     * @param {(DashViewSpec|string)} viewSpec - DashViewSpec (or registered id) to add to the layout
     * @param {object} container - GoldenLayout container to add it to. If not provided, will be added to the root container.
     */
    addView(viewSpec, container) {
        const {goldenLayout} = this;
        if (!goldenLayout) return;

        if (isString(viewSpec)) viewSpec = this.getViewSpec(viewSpec);
        if (!container) container = goldenLayout.root.contentItems[0];

        const config = this.getGLConfig(viewSpec);
        container.addChild(config);
    }

    /**
     * Get all DashView instances currently rendered in the layout
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
    // Implementation - State Management
    //-----------------
    onStateChanged() {
        // Todo: Save an observable model of the state
        // console.log('onStateChanged', this.goldenLayout.toConfig());

        this.renderIcons();
    }

    resetState() {
        // Todo: Load the saved default state
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
            stack.header.controlsContainer.append(`<div class="xh-dash-layout-add-button">${icon}</div>`);
            const btn = stack.header.controlsContainer.find('.xh-dash-layout-add-button');
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
