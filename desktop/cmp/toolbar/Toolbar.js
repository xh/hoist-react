/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {Children} from 'react';
import {hoistCmp} from '@xh/hoist/core';
import {hbox, vbox, fragment, filler} from '@xh/hoist/cmp/layout';
import {overflowList, popover} from '@xh/hoist/kit/blueprint';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import classNames from 'classnames';
import PT from 'prop-types';
import {throwIf} from '@xh/hoist/utils/js';

import './Toolbar.scss';

/**
 * A toolbar with built-in styling and padding.
 * In horizontal toolbars, items which overflow can be collapsed into a drop-down menu.
 */
export const [Toolbar, toolbar] = hoistCmp.withFactory({
    displayName: 'Toolbar',
    model: false, memo: false, observer: false,
    className: 'xh-toolbar',

    render({
        children,
        className,
        vertical,
        enableOverflowMenu = !vertical,
        collapseFrom = 'end',
        minVisibleItems,
        ...rest
    }) {

        throwIf(vertical && enableOverflowMenu, 'Overflow menu not available for vertical toolbars.');

        const container = vertical ? vbox : hbox,
            overflow = enableOverflowMenu && Children.count(children) > 0;

        return container({
            ...rest,
            className: classNames(className, vertical ? 'xh-toolbar--vertical' : null),
            items: overflow ?
                overflowBox({items: children, minVisibleItems, collapseFrom}) :
                children
        });
    }
});


Toolbar.propTypes = {
    /** Custom classes that will be applied to this component */
    className: PT.string,

    /** Set to true to vertically align the items of this toolbar */
    vertical: PT.bool,

    /**
     * Place items that overflow in a menu. Only available for horizontal toolbars.
     * Default to true.
     */
    enableOverflowMenu: PT.bool,

    /**
     * For horizontal toolbars that overflow, manages which direction the items collapse from.
     * Valid values are 'start' or 'end'. Defaults to 'end'.
     */
    collapseFrom: PT.string,

    /**
     * For horizontal toolbars that overflow, manages the minimum number of visible items
     * that should never collapse into the overflow menu.
     */
    minVisibleItems: PT.number
};

//-----------------
// Implementation
///--------------
const overflowBox = hoistCmp.factory({
    model: false, observer: false, memo: false,
    render({children, minVisibleItems, collapseFrom}) {
        return overflowList({
            $items: Children.toArray(children),
            minVisibleItems,
            collapseFrom,
            visibleItemRenderer: (item) => item,
            overflowRenderer: overflowButton
        });
    }
});

const overflowButton = hoistCmp.factory({
    model: false, observer: false, memo: false,
    render({children}) {
        return fragment(
            filler(),
            popover({
                popoverClassName: 'xh-toolbar-overflow-popover',
                position: 'bottom-right',
                target: button({icon: Icon.ellipsisVertical()}),
                content: vbox(children)
            })
        );
    }
});