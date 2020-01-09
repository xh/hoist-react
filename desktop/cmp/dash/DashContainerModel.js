/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistModel, elem} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {GoldenLayout} from '@xh/hoist/kit/golden-layout';
import {convertIconToSvg} from '@xh/hoist/icon';
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

    /** @member {Ref} */
    containerRef = createObservableRef();

    /**
     * Todo
     */
    constructor({
        views = [],
        layout,
        settings
    }) {
        // Add views
        views = views.filter(v => !v.omit);
        ensureUniqueBy(views, 'id');
        views.forEach(view => this.addView(view));

        // Initialize GoldenLayouts once ref is ready
        this.addReaction({
            track: () => this.containerRef.current,
            run: () => this.initGoldenLayout({layout, settings})
        });

        this.addReaction({
            track: () => this.views,
            run: () => this.registerViews()
        });
    }

    //-----------------
    // Golden Layouts
    //-----------------
    @action
    initGoldenLayout({layout, settings}) {
        // Parse structure and apply settings
        this.goldenLayout = new GoldenLayout({
            content: this.parseLayoutConfig(castArray(layout)),
            settings: {
                // Remove icons by default
                showPopoutIcon: false,
                showMaximiseIcon: false,
                showCloseIcon: false,
                ...settings
            },
            dimensions: {
                borderWidth: 6,
                headerHeight: 25
            }
        }, this.containerRef.current);

        this.registerViews();
        this.goldenLayout.init();

        // Initialize state management
        this.goldenLayout.on('stateChanged', () => this.onStateChanged());

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

    registerViews() {
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

    getRenderedComponents() {
        const {goldenLayout} = this;
        if (!goldenLayout) return [];
        return goldenLayout.root.getItemsByType('component');
    }

    //-----------------
    // State Management
    //-----------------
    onStateChanged() {
        console.log('onStateChanged', this.goldenLayout.toConfig());

        this.renderIcons();
    }

    resetState() {
        // Todo: Load the saved default state
    }

    //-----------------
    // Icons
    //-----------------
    renderIcons() {
        // For each component, insert icon in tab if required
        const components = this.getRenderedComponents();
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
