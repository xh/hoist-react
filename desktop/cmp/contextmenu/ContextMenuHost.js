/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {elemFactory} from '@xh/hoist/core';
import {contextMenu} from '@xh/hoist/desktop/cmp/contextmenu/ContextMenu';
import {ContextMenuTarget} from '@xh/hoist/kit/blueprint';
import {isReactElement} from '@xh/hoist/utils/react';
import {isArray, isFunction} from 'lodash';
import PT from 'prop-types';
import {Component} from 'react';

/**
 * Component supporting a right-click ContextMenu on its contents.
 *
 * See also Panel's 'contextMenu' prop, which will delegate to this component and offers the most
 * convenient interface for many application use cases.
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
     * Array of ContextMenuItems, configs to create them, Elements, or the string '-' (divider).
     * Also accepts a function that receives the triggering event and returns such an array or a
     * ContextMenu element directly. A value/return of null will result in no menu being shown.
     */
    contextMenu: PT.oneOfType([PT.func, PT.array, PT.node])
};

export const contextMenuHost = elemFactory(ContextMenuHost);

