/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import type {ContextMenuSpec} from '@xh/hoist/core';
import {contextMenu} from '@xh/hoist/desktop/cmp/contextmenu/ContextMenu';
import {showContextMenu} from '@xh/hoist/kit/blueprint';
import {logError} from '@xh/hoist/utils/log';
import {isArray, isEmpty, isFunction, isUndefined} from 'lodash';
import {cloneElement, isValidElement, MouseEvent, ReactElement} from 'react';

/**
 * Hook to add a right-click context menu to a component.
 *
 * @param child - element to be given context menu support. Must specify a component that takes
 *      the React `onContextMenu` event as a prop (e.g. boxes, panel, div, etc.)
 * @param spec - spec the menu to be shown. If null, or the number of items is empty, no menu will
 *      be rendered and the event will be consumed.
 */
export function useContextMenu(child?: ReactElement, spec?: ContextMenuSpec): ReactElement {
    if (!child || isUndefined(spec)) return child;

    const onContextMenu = (e: MouseEvent | PointerEvent) => {
        let contextMenuOutput: any = spec;

        // 0) Skip if already consumed, otherwise consume (adapted from BP `ContextMenuTarget`).
        if (e.defaultPrevented) return;
        e.preventDefault();

        // 1) Pre-process to an element (potentially via item list) or null.
        if (isFunction(contextMenuOutput)) {
            contextMenuOutput = contextMenuOutput(e);
        }
        if (isArray(contextMenuOutput)) {
            contextMenuOutput = !isEmpty(contextMenuOutput)
                ? contextMenu({menuItems: contextMenuOutput, context: {contextMenuEvent: e}})
                : null;
        }
        if (contextMenuOutput && !isValidElement(contextMenuOutput)) {
            logError(`Incorrect specification of 'contextMenu' arg in useContextMenu()`);
            contextMenuOutput = null;
        }

        // 2) Render via blueprint.
        if (contextMenuOutput) {
            showContextMenu(contextMenuOutput, {left: e.clientX, top: e.clientY});
        }
    };

    return cloneElement(child, {onContextMenu});
}
