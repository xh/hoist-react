/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {filler, fragment, hbox, vbox} from '@xh/hoist/cmp/layout';
import {popover} from '@xh/hoist/cmp/popover';
import type {BoxProps, HoistProps} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {overflowList} from '@xh/hoist/kit/blueprint';
import {filterConsecutiveToolbarSeparators} from '@xh/hoist/utils/impl';
import {throwIf} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {isEmpty} from 'lodash';
import {Children, createElement} from 'react';
import {OverflowList} from './impl/OverflowList';
import './Toolbar.scss';
import {toolbarSeparator} from './ToolbarSep';

export interface ToolbarProps extends HoistProps, BoxProps {
    /** Set to true to style toolbar with reduced height and font-size. */
    compact?: boolean;

    /** Set to true to vertically align the items of this toolbar. */
    vertical?: boolean;

    /**
     * Place items that overflow in a menu. Only available for horizontal toolbars.
     * Default to false. NOTE, the move of components into a menu when they overflow will trigger a
     * remount of those components.
     */
    enableOverflowMenu?: boolean;

    /**
     * For horizontal toolbars that overflow, manages which direction the items collapse from.
     * Defaults to 'end'.
     */
    collapseFrom?: 'start' | 'end';

    /**
     * For horizontal toolbars that overflow, manages the minimum number of visible items
     * that should never collapse into the overflow menu.
     */
    minVisibleItems?: number;
}

export interface ToolbarDefaults {
    compact?: boolean;

    /**
     * True to collapse overflowing toolbar items with Blueprint's `OverflowList`, as before Hoist
     * had its own. For apps to fall back on while they adopt Hoist's - removed in the next major
     * version.
     */
    useBlueprint?: boolean;
}

/**
 * A toolbar with built-in styling and padding.
 * In horizontal toolbars, items which overflow can be collapsed into a drop-down menu.
 */
export const [Toolbar, toolbar] = hoistCmp.withFactory<ToolbarProps, ToolbarDefaults>({
    displayName: 'Toolbar',
    model: false,
    memo: false,
    observer: false,
    className: 'xh-toolbar',
    defaults: {
        compact: false,
        useBlueprint: false
    },

    render(
        {
            children,
            className,
            compact = Toolbar.defaults.compact,
            vertical = false,
            enableOverflowMenu = false,
            collapseFrom = 'end',
            minVisibleItems,
            testId,
            ...rest
        },
        ref
    ) {
        throwIf(
            vertical && enableOverflowMenu,
            'Overflow menu not available for vertical toolbars.'
        );

        const items = Children.toArray(children)
            .filter(filterConsecutiveToolbarSeparators())
            .map(it => (it === '-' ? toolbarSeparator() : it));

        const container = vertical ? vbox : hbox,
            overflow = enableOverflowMenu && !isEmpty(items);

        return container({
            ref,
            testId,
            ...rest,
            className: classNames(
                className,
                compact ? 'xh-toolbar--compact' : null,
                vertical ? 'xh-toolbar--vertical' : null,
                overflow ? 'xh-toolbar--overflow' : null
            ),
            children: overflow
                ? overflowBox({children: items, minVisibleItems, collapseFrom})
                : items
        });
    }
});

//-----------------
// Implementation
//--------------
const overflowBox = hoistCmp.factory({
    model: false,
    observer: false,
    memo: false,
    render({children, minVisibleItems, collapseFrom}) {
        if (!Toolbar.defaults.useBlueprint) {
            return createElement(OverflowList, {
                items: Children.toArray(children),
                minVisibleItems,
                collapseFrom,
                overflowRenderer: items => overflowButton(items)
            });
        }
        return overflowList({
            $items: Children.toArray(children),
            minVisibleItems,
            collapseFrom,
            visibleItemRenderer: item => item,
            overflowRenderer: overflowButton
        });
    }
});

const overflowButton = hoistCmp.factory({
    model: false,
    observer: false,
    memo: false,
    render({children}) {
        return fragment(
            filler(),
            popover({
                popoverClassName: 'xh-toolbar-overflow-popover',
                position: 'bottom-right',
                children: button({icon: Icon.ellipsisVertical()}),
                content: vbox(children)
            })
        );
    }
});
