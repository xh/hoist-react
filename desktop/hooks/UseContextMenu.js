/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {contextMenu as contextMenuEl} from '@xh/hoist/desktop/cmp/contextmenu/ContextMenu';
import {contextMenu2} from '@xh/hoist/kit/blueprint';
import {isArray, isFunction, isUndefined, isEmpty} from 'lodash';
import {isValidElement} from 'react';

/**
 * Hook to add context menu support to a component.
 *
 * @param {element} [child] - element to be given context menu support.
 * @param {(Array|function|element)} [contextMenu] -  Array of ContextMenuItems, configs to create them,
 *      Elements, or '-' (divider).  Or a function that receives the target offset and returns such an array.
 *      If null, or the number of items is empty, no menu will be rendered, and the event will be consumed.
 *      A ContextMenu element may also be provided.
 */
export function useContextMenu(child, contextMenu) {

    if (!child || isUndefined(contextMenu)) return child;

    const content = (isOpen, targetOffset) => {
        let ret = contextMenu;

        // 1) Pre-process to an element (potentially via item list) or null
        if (isFunction(ret)) {
            ret = ret(targetOffset);
        }
        if (isArray(ret)) {
            ret = !isEmpty(ret) ? contextMenuEl({menuItems: ret}) : null;
        }
        if (ret && !isValidElement(ret)) {
            console.error("Incorrect specification of 'contextMenu' arg in useContextMenu()");
            ret = null;
        }
        return ret;
    };

    return contextMenu2({item: child, content});
}
