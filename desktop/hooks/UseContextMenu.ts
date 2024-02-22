/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {contextMenu, ContextMenuSpec} from '@xh/hoist/desktop/cmp/contextmenu/ContextMenu';
import {showContextMenu} from '@xh/hoist/kit/blueprint';
import {isArray, isFunction, isUndefined, isEmpty} from 'lodash';
import {ReactElement} from 'react';
import {cloneElement, isValidElement} from 'react';

/**
 * Hook to add context menu support to a component.
 *
 * @param child - element to be given context menu support. Must specify Component
 *      that takes react context menu event as a prop (e.g. boxes, panel, div, etc).
 * @param spec - Context Menu to be shown. If null, or the number of items is empty,
 *      no menu will be rendered, and the event will be consumed.
 */
export function useContextMenu(child?: ReactElement, spec?: ContextMenuSpec): ReactElement {
    if (!child || isUndefined(spec)) return child;

    const onContextMenu = (e: MouseEvent) => {
        let contextMenuOutput: any = spec;

        // 0) Skip if already consumed, otherwise consume (Adapted from Blueprint 'ContextMenuTarget')
        if (e.defaultPrevented) return;
        e.preventDefault();

        // 1) Pre-process to an element (potentially via item list) or null
        if (isFunction(contextMenuOutput)) {
            contextMenuOutput = contextMenuOutput(e);
        }
        if (isArray(contextMenuOutput)) {
            contextMenuOutput = !isEmpty(contextMenuOutput)
                ? contextMenu({menuItems: contextMenuOutput})
                : null;
        }
        if (contextMenuOutput && !isValidElement(contextMenuOutput)) {
            console.error("Incorrect specification of 'contextMenu' arg in useContextMenu()");
            contextMenuOutput = null;
        }

        // 2) Render via blueprint!
        if (contextMenuOutput) {
            showContextMenu({
                content: contextMenuOutput,
                targetOffset: {left: e.clientX, top: e.clientY}
            });
        }
    };

    return cloneElement(child, {onContextMenu});
}
