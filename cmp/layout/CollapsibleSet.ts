/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {fieldset, vbox} from '@xh/hoist/cmp/layout';
import type {HoistProps, Intent, LayoutProps, RenderMode, TestSupportProps} from '@xh/hoist/core';
import {BoxProps, hoistCmp, XH} from '@xh/hoist/core';
import {collapsibleSetButton as desktopCollapsibleSetButtonImpl} from '@xh/hoist/dynamics/desktop';
import {collapsibleSetButton as mobileCollapsibleSetButtonImpl} from '@xh/hoist/dynamics/mobile';
import {mergeDeep, TEST_ID} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {castArray} from 'lodash';
import {type FieldsetHTMLAttributes, type ReactElement, type ReactNode, useState} from 'react';

import './CollapsibleSet.scss';

export interface CollapsibleSetProps
    extends FieldsetHTMLAttributes<HTMLFieldSetElement>, HoistProps, TestSupportProps, LayoutProps {
    icon?: ReactElement;
    label: ReactNode;
    tooltip?: ReactElement | string;
    intent?: Intent;
    clickHandler?: () => void;
    collapsed?: boolean;
    hideItemCount?: boolean;
    renderMode?: RenderMode;
    innerBoxProps?: BoxProps;
}

export const [CollapsibleSet, collapsibleSet] = hoistCmp.withFactory<CollapsibleSetProps>({
    displayName: 'CollapsibleSet',
    model: false,
    className: 'xh-collapsible-set',
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
        renderMode = 'unmountOnHide',
        innerBoxProps = {},
        ...rest
    }) {
        // Note `model` destructured off of non-layout props to avoid setting
        // model as a bogus DOM attribute. This low-level component may easily be passed one from
        // a parent that has not properly managed its own props.
        let [layoutProps, {model, testId, ...restProps}] = splitLayoutProps(rest);

        restProps = mergeDeep({style: layoutProps}, {[TEST_ID]: testId}, restProps);

        const [isCollapsed, setIsCollapsed] = useState<boolean>(collapsed === true),
            [expandCount, setExpandCount] = useState<number>(!collapsed ? 1 : 0),
            items = castArray(children),
            itemCount = hideItemCount === true ? '' : ` (${items.length})`,
            classes = [];

        if (isCollapsed) {
            classes.push('xh-collapsible-set--collapsed');
        } else {
            classes.push('xh-collapsible-set--expanded');
        }

        if (disabled) {
            classes.push('xh-collapsible-set--disabled');
        } else {
            classes.push('xh-collapsible-set--enabled');
        }

        if (intent) {
            classes.push(`xh-collapsible-set--intent-${intent}`);
        } else {
            classes.push(`xh-collapsible-set--intent-none`);
        }

        const btn = XH.isMobileApp
            ? mobileCollapsibleSetButtonImpl
            : desktopCollapsibleSetButtonImpl;

        if (isCollapsed) {
            classes.push('xh-collapsible-set--collapsed');
        }

        let content;
        switch (renderMode) {
            case 'always':
                content = items;
                classes.push('xh-collapsible-set--render-mode-always');
                break;

            case 'lazy':
                content = isCollapsed && !expandCount ? [] : items;
                classes.push('xh-collapsible-set--render-mode-lazy');
                break;

            // unmountOnHide
            default:
                content = isCollapsed ? [] : items;
                classes.push('xh-collapsible-set--render-mode-unmount-on-hide');
                break;
        }

        return fieldset({
            className: classNames(className, classes),
            items: [
                btn({
                    icon,
                    text: `${label}${itemCount}`,
                    tooltip,
                    intent,
                    clickHandler: val => {
                        setIsCollapsed(val);
                        setExpandCount(expandCount + 1);
                    },
                    collapsed: isCollapsed,
                    disabled
                }),
                vbox({
                    className: 'xh-collapsible-set__content',
                    items: content,
                    display: isCollapsed ? 'none' : 'flex',
                    flexWrap: 'wrap',
                    ...innerBoxProps
                })
            ],
            disabled,
            ...restProps
        });
    }
});
