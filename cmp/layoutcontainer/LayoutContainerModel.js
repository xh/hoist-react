/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistModel, elem} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {GoldenLayout} from '@xh/hoist/kit/golden-layout';
import {createObservableRef} from '@xh/hoist/utils/react';
import {throwIf} from '@xh/hoist/utils/js';
import {isPlainObject, isString, isArray, castArray} from 'lodash';

/**
 * Model for a LayoutContainer, representing its layout and contents.
 *
 * Todo
 */
@HoistModel
export class LayoutContainerModel {

    /** @member {GoldenLayout} */
    @observable.ref goldenLayout;

    /** @member {Ref} */
    containerRef = createObservableRef();

    /**
     * Todo
     */
    constructor({
        panels,
        layout,
        settings
    }) {
        // Initialize once ref is ready
        this.addReaction({
            track: () => this.containerRef.current,
            run: () => this.initGoldenLayout(layout, panels, settings)
        });
    }

    @action
    initGoldenLayout(layout, panels, settings) {
        // Parse structure and apply settings
        this.layout = new GoldenLayout({
            content: this.parseLayoutConfig(castArray(layout)),
            settings: {
                ...this.getDefaultSettings(),
                ...settings
            }
        }, this.containerRef.current);

        // Register each component with GoldenLayouts
        panels.forEach(spec => {
            this.registerComponent(spec);
        });

        this.layout.on('stateChanged', () => this.onStateChanged());
        this.layout.init();
    }

    getDefaultSettings() {
        // Todo: Can we turn off tabs using 'hasHeaders' below, and still enable drag and drop?
        return {
            // hasHeaders: false,
            constrainDragToContainer: true,
            reorderEnabled: true,
            selectionEnabled: false,
            popoutWholeStack: false,
            blockedPopoutsThrowError: true,
            closePopoutsOnUnload: true,
            showPopoutIcon: false,
            showMaximiseIcon: false,
            showCloseIcon: false
        };
    }

    parseLayoutConfig(layout = []) {
        return layout.map(it => {
            if (isString(it)) {
                // Uses component id shorthand
                return {
                    id: it,
                    component: it,
                    title: it,
                    type: 'react-component',
                    isClosable: false
                };
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

    registerComponent(spec) {
        const {id, content} = spec,
            contentElem = content.isHoistComponent ? elem(content, {flex: 1}) : content();
        this.layout.registerComponent(id, () => contentElem);
    }

    onStateChanged() {
        console.log('onStateChanged', this.layout.toConfig());
    }

}
