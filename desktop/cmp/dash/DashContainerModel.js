/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistModel, elem} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {GoldenLayout} from '@xh/hoist/kit/golden-layout';
import {Icon, convertIconToSvg} from '@xh/hoist/icon';
import {createObservableRef} from '@xh/hoist/utils/react';
import {ensureUniqueBy, throwIf} from '@xh/hoist/utils/js';
import {isPlainObject, isString, isArray, castArray} from 'lodash';

import {DashViewModel} from './DashViewModel';

/**
 * Model for a DashContainer, representing its layout and contents.
 *
 * This object provides support for managing dash views, adding new views on the fly,
 * and tracking / loading layout state.
 */
@HoistModel
export class DashContainerModel {

    /** @member {DashViewModel[]} */
    @observable.ref views = [];

    /** @member {GoldenLayout} */
    @observable.ref goldenLayout;

    /** member {boolean} */
    @observable dialogIsOpen;

    /** @member {Ref} */
    containerRef = createObservableRef();

    /** @member {boolean} */
    enableAdd;

    /**
     * Todo
     */
    constructor({
        views = [],
        layout,
        glSettings,
        enableAdd = true
    }) {
        this.enableAdd = enableAdd;

        // Add views
        views = views.filter(v => !v.omit);
        ensureUniqueBy(views, 'id');
        views.forEach(view => this.addView(view));

        // Initialize GoldenLayouts once ref is ready
        this.addReaction({
            track: () => this.containerRef.current,
            run: () => this.initGoldenLayout({layout, glSettings})
        });

        this.addReaction({
            track: () => this.views,
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
                // Uses component id shorthand
                const view = this.getView(it);
                return view?.glConfig;
            } else if (isPlainObject(it) && isArray(it.content)) {
                // Is a container - ensure correctly configured and parse children
                const {type, content, ...rest} = it;

                throwIf(!['row', 'column'].includes(type), 'Container type must either "row" or "column"');
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
     * @param {DashViewModel} cfg - Config for DockViewModel to be added.
     */
    @action
    addView(cfg = {}) {
        throwIf(this.getView(cfg.id), `View with id=${cfg.id} already registered`);
        this.views = [new DashViewModel({...cfg, containerModel: this}), ...this.views];
    }

    getView(id) {
        return this.views.find(it => it.id === id);
    }

    //-----------------
    // Components
    //-----------------
    /**
     * Add a view component to the layout.
     *
     * @param {(DashViewModel|string)} view - DashViewModel (or registered id) to add to the layout
     * @param {object} container - GoldenLayout container to add it to. If not provided, will be added to the root container.
     */
    addComponent(view, container) {
        const {goldenLayout} = this;
        if (!goldenLayout) return;

        if (isString(view)) view = this.getView(view);
        if (!container) container = goldenLayout.root.contentItems[0];
        container.addChild(view.glConfig);
    }

    /**
     * Get all component instances currently rendered in the layout
     */
    getComponents() {
        const {goldenLayout} = this;
        if (!goldenLayout) return [];
        return goldenLayout.root.getItemsByType('component');
    }

    /**
     * Get all component instances with a given view id
     */
    getComponentsById(id) {
        return this.getComponents().filter(it => it.config.component === id);
    }

    /**
     * Called to automatically synchronize GoldenLayouts' component registry with our collection of views
     */
    registerComponents() {
        const {goldenLayout} = this;
        if (!goldenLayout) return;
        this.views.forEach(view => {
            const {id, content} = view;
            try {
                const contentElem = content.isHoistComponent ? elem(content, {flex: 1}) : content();
                goldenLayout.registerComponent(id, () => contentElem);
            } catch {
                // GoldenLayout.registerComponent() throws if component is already registered.
                // There doesn't seem to be a way to check if a component is already registered without
                // throwing (GoldenLayout.getComponent() throws if the component is *not* registered)
            }
        });
    }

    //-----------------
    // State Management
    //-----------------
    onStateChanged() {
        // Todo: Save an observable model of the state
        console.log('onStateChanged', this.goldenLayout.toConfig());

        this.renderIcons();
    }

    resetState() {
        // Todo: Load the saved default state
    }

    //-----------------
    // Add View Dialog
    //-----------------
    onStackCreated(stack) {
        if (!this.enableAdd) return;

        // Add '+' icon and attach click listener for adding components
        const icon = convertIconToSvg(Icon.add());
        stack.header.controlsContainer.append(`<div class="xh-dash-layout-add-button">${icon}</div>`);
        const btn = stack.header.controlsContainer.find('.xh-dash-layout-add-button');
        btn.click(() => this.openViewDialog(stack));
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

    submitViewDialog(view) {
        this.addComponent(view, this._dialogSelectedStack);
    }

    //-----------------
    // Icons
    //-----------------
    renderIcons() {
        // For each component, insert icon in tab if required
        const components = this.getComponents();
        components.forEach(component => {
            const id = component.config.component,
                el = component.tab.element,
                view = this.getView(id);

            if (view?.icon && !el.find('svg.svg-inline--fa').length) {
                const iconSvg = convertIconToSvg(view.icon);
                el.find('.lm_title').before(iconSvg);
            }
        });
    }

}
