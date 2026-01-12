/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import classNames from 'classnames';
import {castArray} from 'lodash';
import {type FieldsetHTMLAttributes, type ReactElement, type ReactNode, useState} from 'react';
import {XH, hoistCmp} from '@xh/hoist/core';
import type {HoistProps, Intent, LayoutProps, RenderMode, TestSupportProps} from '@xh/hoist/core';
import {fieldset} from '@xh/hoist/cmp/layout';
import {TEST_ID, mergeDeep} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {collapsibleSetButton as desktopCollapsibleSetButtonImpl} from '@xh/hoist/dynamics/desktop';
import {collapsibleSetButton as mobileCollapsibleSetButtonImpl} from '@xh/hoist/dynamics/mobile';

import './CollapsibleSet.scss';

export interface CollapsibleSetProps
    extends FieldsetHTMLAttributes<HTMLFieldSetElement>, HoistProps, TestSupportProps, LayoutProps {
    icon?: ReactElement;
    label: ReactNode;
    tooltip?: JSX.Element | string;
    intent?: Intent;
    clickHandler?: () => void;
    collapsed?: boolean;
    hideItemCount?: boolean;
    renderMode?: RenderMode;
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
        display = 'flex',
        flexDirection = 'column',
        flexWrap = 'wrap',
        renderMode = 'unmountOnHide',
        ...rest
    }) {
        // Note `model` destructured off of non-layout props to avoid setting
        // model as a bogus DOM attribute. This low-level component may easily be passed one from
        // a parent that has not properly managed its own props.
        let [layoutProps, {model, testId, ...restProps}] = splitLayoutProps(rest);

        restProps = mergeDeep(
            {style: {display, flexDirection, flexWrap, ...layoutProps}},
            {[TEST_ID]: testId},
            restProps
        );

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

        let content;
        switch (renderMode) {
            case 'always':
                content = items;
                if (isCollapsed) {
                    classes.push('xh-collapsible-set--collapsed--render-mode--always');
                }
                break;

            case 'lazy':
                content = isCollapsed && !expandCount ? [] : items;
                if (isCollapsed) {
                    classes.push('xh-collapsible-set--collapsed--render-mode--lazy');
                }
                break;

            // unmountOnHide
            default:
                content = isCollapsed ? [] : items;
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
                ...content
            ],
            disabled,
            ...restProps
        });
    }
});
