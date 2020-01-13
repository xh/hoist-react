/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {isEmpty, isFinite, isArray} from 'lodash';

/**
 * Convert the output from Golden Layouts into our serializable state
 */
export function convertGLToState(configItems = [], contentItems = [], viewState) {
    const ret = [];

    configItems.forEach((configItem, idx) => {
        const contentItem = contentItems[idx];

        if (configItem.type === 'component') {
            const state = viewState[getViewModelId(contentItem)],
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
                container.content = convertGLToState(content, contentItem.contentItems, viewState);
            }

            ret.push(container);
        }
    });

    return ret;
}

/**
 * Convert our serializable state into GoldenLayouts config
 */
export function convertStateToGL(state = [], viewSpecs = []) {
    return state.map(it => {
        if (it.type === 'view') {
            const viewSpec = viewSpecs.find(v => v.id === it.id);
            if (!viewSpec) return null;

            const ret = getGLConfig(viewSpec);
            if (it.state) ret.state = it.state;

            return ret;
        } else {
            const {content, ...rest} = it;
            return {
                content: convertStateToGL(content, viewSpecs),
                ...rest
            };
        }
    });
}

/**
 * Convert a ViewSpec into a GoldenLayouts component config
 */
export function getGLConfig(viewSpec) {
    const {id, title, allowClose} = viewSpec;
    return {
        component: id,
        type: 'react-component',
        title,
        isClosable: allowClose
    };
}

/**
 * Lookup the DashViewModel id of a rendered view
 */
export function getViewModelId(view) {
    if (!view || !view.isInitialised || !view.isComponent) return;
    return view.instance?._reactComponent?.props?.id;
}
