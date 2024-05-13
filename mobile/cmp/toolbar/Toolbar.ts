/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hbox, vbox} from '@xh/hoist/cmp/layout';
import {BoxProps, hoistCmp, HoistProps} from '@xh/hoist/core';
import '@xh/hoist/mobile/register';
import {toolbarSeparator} from '@xh/hoist/mobile/cmp/toolbar';
import {filterConsecutiveToolbarSeparators} from '@xh/hoist/utils/impl';
import classNames from 'classnames';
import './Toolbar.scss';
import {Children} from 'react';

export interface ToolbarProps extends HoistProps, BoxProps {
    /** Set to true to vertically align the items of this toolbar */
    vertical?: boolean;
}

/**
 * A toolbar with built-in styling and padding.
 */
export const [Toolbar, toolbar] = hoistCmp.withFactory<ToolbarProps>({
    displayName: 'Toolbar',
    className: 'xh-toolbar',
    model: false,
    memo: false,
    observer: false,

    render({children, className, vertical, ...rest}, ref) {
        const items = Children.toArray(children)
            .filter(filterConsecutiveToolbarSeparators())
            .map(it => (it === '-' ? toolbarSeparator() : it));

        return (vertical ? vbox : hbox)({
            ref,
            items,
            className: classNames(className, vertical ? 'xh-toolbar--vertical' : null),
            ...rest
        });
    }
});
