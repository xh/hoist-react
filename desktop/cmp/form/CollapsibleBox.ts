/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import classNames from 'classnames';
import {castArray} from 'lodash';
import {type FieldsetHTMLAttributes, type ReactElement, type ReactNode, useState} from 'react';
import {hoistCmp} from '@xh/hoist/core';
import type {HoistProps, Intent} from '@xh/hoist/core';
import {fieldset} from '@xh/hoist/cmp/layout';
import {collapsibleBoxButton} from '@xh/hoist/desktop/cmp/button/CollapsibleBoxButton';

import './CollapsibleBox.scss';

export interface CollapsibleBoxProps
    extends FieldsetHTMLAttributes<HTMLFieldSetElement>, HoistProps {
    icon?: ReactElement;
    label: ReactNode;
    tooltip?: JSX.Element | string;
    intent?: Intent;
    clickHandler?: () => void;
    collapsed?: boolean;
    hideItemCount?: boolean;
}

export const [CollapsibleBox, collapsibleBox] = hoistCmp.withFactory<CollapsibleBoxProps>({
    displayName: 'FieldsetCollapseButton',
    model: false,
    className: 'xh-collapsible-box',
    render({
        icon,
        label,
        tooltip,
        intent,
        collapsed,
        children,
        hideItemCount,
        className,
        disabled,
        ...rest
    }) {
        const [isCollapsed, setIsCollapsed] = useState<boolean>(collapsed === true),
            items = castArray(children),
            itemCount = hideItemCount === true ? '' : ` (${items.length})`,
            classes = [];

        if (isCollapsed) {
            classes.push('xh-collapsible-box--collapsed');
        } else {
            classes.push('xh-collapsible-box--expanded');
        }

        if (disabled) {
            classes.push('xh-collapsible-box--disabled');
        } else {
            classes.push('xh-collapsible-box--enabled');
        }

        if (intent) {
            classes.push(`xh-collapsible-box--intent-${intent}`);
        } else {
            classes.push(`xh-collapsible-box--intent-none`);
        }

        return fieldset({
            className: classNames(className, classes),
            items: [
                collapsibleBoxButton({
                    icon,
                    text: `${label}${itemCount}`,
                    tooltip,
                    intent,
                    clickHandler: val => setIsCollapsed(val),
                    collapsed: isCollapsed,
                    disabled
                }),
                ...(isCollapsed ? [] : items)
            ],
            disabled,
            ...rest
        });
    }
});
