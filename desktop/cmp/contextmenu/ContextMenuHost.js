/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistCmp, XH} from '@xh/hoist/core';
import {contextMenu as contextMenuEl} from '@xh/hoist/desktop/cmp/contextmenu/ContextMenu';
import {ContextMenu} from '@xh/hoist/kit/blueprint';
import {isArray, isFunction} from 'lodash';
import PT from 'prop-types';
import {Children, cloneElement, isValidElement} from 'react';

/**
 * Component supporting a right-click ContextMenu on its contents.
 *
 * See also Panel's 'contextMenu' prop, which will delegate to this component and offers the most
 * convenient interface for many application use cases.
 */
export const [ContextMenuHost, contextMenuHost] = hoistCmp.withFactory({
    displayName: 'ContextMenuHost',
    observer: false, memo: false, model: false,

    render({children, contextMenu, ...props}) {

        const onContextMenu = (e) => {
            if (isFunction(contextMenu)) {
                contextMenu = contextMenu(e);
            }
            if (isArray(contextMenu)) {
                contextMenu = contextMenuEl({menuItems: contextMenu});
            }

            if (!isValidElement(contextMenu)) {
                console.error('Incorrect specification of ContextMenu in ContextMenuHost');
                return;
            }

            // Adapted from Blueprint 'ContextMenuTarget'
            if (e.defaultPrevented) return;
            e.preventDefault();
            ContextMenu.show(contextMenu, {left: e.clientX, top: e.clientY}, null, XH.darkTheme);
        };

        return cloneElement(Children.only(children), {onContextMenu});
    }
});

ContextMenuHost.propTypes = {
    /**
     * Array of ContextMenuItems, configs to create them, Elements, or the string '-' (divider).
     * Also accepts a function that receives the triggering event and returns such an array or a
     * ContextMenu element directly. A value/return of null will result in no menu being shown.
     */
    contextMenu: PT.oneOfType([PT.func, PT.array, PT.node])
};

