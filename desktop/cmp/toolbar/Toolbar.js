/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {filler, fragment, hbox, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {overflowList, popover} from '@xh/hoist/kit/blueprint';
import {filterConsecutiveToolbarSeparators} from '@xh/hoist/utils/impl';
import {throwIf} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {isEmpty} from 'lodash';
import PT from 'prop-types';
import {Children} from 'react';
import './Toolbar.scss';
import {toolbarSeparator} from './ToolbarSep';

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
        compact = false,
        vertical = false,
        enableOverflowMenu = false,
        collapseFrom = 'end',
        minVisibleItems,
        ...rest
    }, ref) {
        throwIf(vertical && enableOverflowMenu, 'Overflow menu not available for vertical toolbars.');

        const items = Children.toArray(children)
            .filter(filterConsecutiveToolbarSeparators())
            .map(it => it === '-' ? toolbarSeparator() : it);

        const container = vertical ? vbox : hbox,
            overflow = enableOverflowMenu && !isEmpty(items);

        return container({
            ref,
            ...rest,
            className: classNames(
                className,
                compact ? 'xh-toolbar--compact' : null,
                vertical ? 'xh-toolbar--vertical' : null,
                overflow ? 'xh-toolbar--overflow' : null
            ),
            items: overflow ?
                overflowBox({items, minVisibleItems, collapseFrom}) :
                items
        });
    }
});

Toolbar.propTypes = {
    /** Custom classes that will be applied to this component */
    className: PT.string,

    /** Set to true to style toolbar with reduced height and font-size. */
    compact: PT.bool,

    /** Set to true to vertically align the items of this toolbar */
    vertical: PT.bool,

    /**
     * Place items that overflow in a menu. Only available for horizontal toolbars.
     * Default to false. NOTE, the move of components into a menu when they overflow will trigger a
     * remount of those components.
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
//--------------
const overflowBox = hoistCmp.factory({
    model: false, observer: false, memo: false,
    render({children, minVisibleItems, collapseFrom}) {
        return overflowList({
            $items: children,
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
