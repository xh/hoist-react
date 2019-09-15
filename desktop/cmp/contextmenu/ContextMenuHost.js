/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory} from '@xh/hoist/core';
import {contextMenu} from '@xh/hoist/desktop/cmp/contextmenu/ContextMenu';

import {isArray, isFunction} from 'lodash';
import {ContextMenuTarget} from '@xh/hoist/kit/blueprint';
import {isReactElement} from '@xh/hoist/utils/react';
import PT from 'prop-types';

/**
 * Component supporting a ContextMenu for its contents.
 *
 * See also Panel's 'contextMenu' prop, which will delegate to this component
 * For many usages this will provide a more convenient interface.
 *
 * See the BlueprintJS docs for more information about the implementation of this mixin.
 */
export const ContextMenuHost = ContextMenuTarget(
    class extends Component {
        render() {
            return this.props.children;
        }

        renderContextMenu(e) {
            let spec  = this.props.contextMenu;
            if (isFunction(spec)) spec = spec(e);

            if (isArray(spec)) return contextMenu({menuItems: spec});
            if (isReactElement(spec)) return spec;

            return null;
        }
    }
);
ContextMenuHost.propTypes = {

    /**
     * Specify the context menu for this object.
     *
     * An element representing the ContextMenu. Or an Array of ContextMenuItems, configs to
     * create them, Elements, or '-' (divider).  Or a function that receives the context event
     * triggering the context menu and returns the same.
     *
     * A value of null will result in no value being shown.
     */
    contextMenu: PT.oneOfType([PT.func, PT.array, PT.node])
};
export const contextMenuHost = elemFactory(ContextMenuHost);

