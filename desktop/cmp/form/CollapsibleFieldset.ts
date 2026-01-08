/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {fieldsetCollapseButton} from '@xh/hoist/desktop/cmp/button/FieldsetCollapseButton';
import classNames from 'classnames';
import {castArray} from 'lodash';
import {type FieldsetHTMLAttributes, type ReactElement, type ReactNode, useState} from 'react';
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import {fieldset} from '@xh/hoist/cmp/layout';

import './CollapsibleFieldset.scss';

export interface CollapsibleFieldsetProps
    extends FieldsetHTMLAttributes<HTMLFieldSetElement>, HoistProps {
    icon?: ReactElement;
    label: ReactNode;
    clickHandler?: () => void;
    collapsed?: boolean;
    hideItemCount?: boolean;
}

export const [CollapsibleFieldset, collapsibleFieldset] =
    hoistCmp.withFactory<CollapsibleFieldsetProps>({
        displayName: 'FieldsetCollapseButton',
        model: false,
        className: 'xh-collapsible-fieldset',
        render({icon, label, collapsed, children, hideItemCount, className, disabled, ...rest}) {
            const [isCollapsed, setIsCollapsed] = useState<boolean>(collapsed === true),
                items = castArray(children),
                itemCount = hideItemCount === true ? '' : ` (${items.length})`,
                classes = [];

            if (isCollapsed) {
                classes.push('xh-collapsible-fieldset--collapsed');
            } else {
                classes.push('xh-collapsible-fieldset--expanded');
            }

            if (disabled) {
                classes.push('xh-collapsible-fieldset--disabled');
            } else {
                classes.push('xh-collapsible-fieldset--enabled');
            }

            return fieldset({
                className: classNames(className, classes),
                items: [
                    fieldsetCollapseButton({
                        icon,
                        text: `${label}${itemCount}`,
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
