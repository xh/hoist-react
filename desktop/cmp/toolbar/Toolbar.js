/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {isValidElement, cloneElement} from 'react';
import {hoistCmp} from '@xh/hoist/core';
import {hbox, vbox, fragment, filler} from '@xh/hoist/cmp/layout';
import {overflowList, popover} from '@xh/hoist/kit/blueprint';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {castArray} from 'lodash';
import classNames from 'classnames';
import PT from 'prop-types';

import './Toolbar.scss';

/**
 * A toolbar with built-in styling and padding.
 * Child items provided as raw configs will be created as buttons by default.
 * In horizontal toolbars, items which overflow will be collapsed into a drop down menu.
 */
export const [Toolbar, toolbar] = hoistCmp.withFactory({
    displayName: 'Toolbar',
    model: false, memo: false, observable: false,
    className: 'xh-toolbar',

    render(props) {
        const {children, className, vertical, collapseFrom = 'end', minVisibleItems, ...rest} = props;

        return (vertical ? vbox : hbox)({
            ...rest,
            className: classNames(className, vertical ? 'xh-toolbar--vertical' : null),
            item: itemContainer({
                $items: castArray(children),
                vertical,
                minVisibleItems,
                collapseFrom
            })
        });
    }
});

const itemContainer = hoistCmp.factory({
    render({items, vertical, minVisibleItems, collapseFrom}) {
        if (!items || !items.length) return null;

        // Overflow collapse is not supported for vertical toolbars
        if (vertical) return fragment(items);

        return overflowList({
            $items: items,
            minVisibleItems,
            collapseFrom,
            visibleItemRenderer: (item, key) => {
                return isValidElement(item) ? cloneElement(item, {key}) : item;
            },
            overflowRenderer: (overflowItems) => {
                return itemOverflowButton({overflowItems});
            }
        });
    }
});

const itemOverflowButton = hoistCmp.factory({
    render({overflowItems}) {
        return fragment(
            filler(),
            popover({
                popoverClassName: 'xh-toolbar-overflow-popover',
                position: 'bottom-right',
                target: button({icon: Icon.ellipsisVertical()}),
                content: vbox(
                    ...overflowItems
                )
            })
        );
    }
});

Toolbar.propTypes = {
    /** Custom classes that will be applied to this component */
    className: PT.string,

    /** Set to true to vertically align the items of this toolbar */
    vertical: PT.bool,

    /** Which direction the items should collapse from: 'start' or 'end' of the children. */
    collapseFrom: PT.string,

    /** The minimum number of visible items that should never collapse into the overflow menu */
    minVisibleItems: PT.number
};