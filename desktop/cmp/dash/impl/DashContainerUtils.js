/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {isFinite, isArray} from 'lodash';

/**
 * Convert the output from Golden Layouts into our serializable state
 */
export function convertGLToState(gl = []) {
    return gl.map(it => {
        if (it.type === 'component') {
            // Todo: Read 'sidecar state'
            return {
                type: 'view',
                id: it.component
            };
        } else {
            const {type, width, height, activeItemIndex, content} = it,
                ret = {type};

            if (isFinite(width)) ret.width = width;
            if (isFinite(height)) ret.height = height;
            if (isFinite(activeItemIndex)) ret.activeItemIndex = activeItemIndex;
            if (isArray(content) && content.length) ret.content = convertGLToState(content);

            return ret;
        }
    });
}

/**
 * Convert our serializable state into GoldenLayouts config
 */
export function convertStateToGL(state = [], viewSpecs = []) {
    return state.map(it => {
        if (it.type === 'view') {
            const viewSpec = viewSpecs.find(v => v.id === it.id);
            return getGLConfig(viewSpec);
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
