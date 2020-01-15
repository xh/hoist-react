/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {isEmpty, isFinite, isArray, isPlainObject} from 'lodash';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Convert the output from Golden Layouts into our serializable state
 */
export function convertGLToState(goldenLayout, viewState) {
    const configItems = goldenLayout.toConfig().content,
        contentItems = goldenLayout.root.contentItems;

    return convertGLToStateInner(configItems, contentItems, viewState);
}

function convertGLToStateInner(configItems = [], contentItems = [], viewState) {
    const ret = [];

    configItems.forEach((configItem, idx) => {
        const contentItem = contentItems[idx];

        if (configItem.type === 'component') {
            const state = viewState[getTabModelId(contentItem)],
                view = {type: 'view', id: configItem.component};

            if (!isEmpty(state)) view.state = state;

            ret.push(view);
        } else {
            const {type, width, height, activeItemIndex, content} = configItem,
                container = {type};

            if (isFinite(width)) container.width = width;
            if (isFinite(height)) container.height = height;
            if (isFinite(activeItemIndex)) container.activeItemIndex = activeItemIndex;
            if (isArray(content) && content.length) {
                container.content = convertGLToStateInner(content, contentItem.contentItems, viewState);
            }

            ret.push(container);
        }
    });

    return ret;
}

/**
 * Convert our serializable state into GoldenLayout config
 */
export function convertStateToGL(state = [], viewSpecs = []) {
    return state.map(item => {
        const {type} = item;

        throwIf(type === 'component' || type === 'react-component',
            'Trying to use "component" or "react-component" types. Use type="view" instead.'
        );

        if (type === 'view') {
            const viewSpec = viewSpecs.find(v => v.id === item.id);

            if (!viewSpec) {
                console.warn(`Attempting to load unrecognised view "${item.id}" from state`);
                return {type: 'row'};
            }

            const ret = viewSpec.goldenLayoutConfig,
                {state, width, height} = item;

            if (isPlainObject(state)) ret.state = state;
            if (isFinite(width)) ret.width = width;
            if (isFinite(height)) ret.height = height;

            return ret;
        } else {
            const content = convertStateToGL(item.content, viewSpecs);
            return {...item, content};
        }
    });
}

/**
 * Lookup the DashTabModel id of a rendered view
 */
export function getTabModelId(view) {
    if (!view || !view.isInitialised || !view.isComponent) return;
    return view.instance?._reactComponent?.props?.id;
}
