/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {applyMixin} from '@xh/hoist/utils/js';
import {contextMenu} from './ContextMenu';
import {ContextMenuTarget} from '@xh/hoist/kit/blueprint';

/**
 * Mixin to allow a Component to show a ContextMenu.
 *
 * Components that use this mixin should implement a getContextMenuItems() method.
 *
 * See the BlueprintJS docs for more information about the implementation of this mixin.
 */
export function ContextMenuSupport(C) {
    return applyMixin(C, {
        name: 'ContextMenuSupport',
        includes: [ContextMenuTarget],

        defaults: {

            /**
             * Specify the context menu for this object.
             *
             * @param {Object} e - event triggering the context menu.
             *
             * Return items to be rendered, or null to prevent rendering of context menu.
             * @returns {Object[]} - Array of ContextMenuItems, configs to create them, Elements, or '-' (divider).
             */
            getContextMenuItems(e) {
                return null;
            },

            /**
             * Method prescribed by BlueprintJS for rendering ContextMenuItems.
             *
             * Application should not typically override this method.  See
             * getContextMenuItems() instead.
             */
            renderContextMenu(e) {
                const items = this.getContextMenuItems(e);
                return items ? contextMenu({menuItems: items}) : null;
            }
        }
    });
}
