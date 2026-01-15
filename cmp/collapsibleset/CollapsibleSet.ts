/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {fieldset, vbox} from '@xh/hoist/cmp/layout';
import {HoistProps, Intent, LayoutProps, TestSupportProps, uses} from '@xh/hoist/core';
import {BoxProps, hoistCmp, XH} from '@xh/hoist/core';
import {collapsibleSetButton as desktopCollapsibleSetButtonImpl} from '@xh/hoist/dynamics/desktop';
import {collapsibleSetButton as mobileCollapsibleSetButtonImpl} from '@xh/hoist/dynamics/mobile';
import {mergeDeep, TEST_ID} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {castArray} from 'lodash';
import {type FieldsetHTMLAttributes, type ReactElement, type ReactNode, useRef} from 'react';
import {CollapsibleSetModel} from './CollapsibleSetModel';

import './CollapsibleSet.scss';

export interface CollapsibleSetProps
    extends
        HoistProps<CollapsibleSetModel>,
        FieldsetHTMLAttributes<HTMLFieldSetElement>,
        TestSupportProps,
        LayoutProps {
    /** An icon placed left of the label. */
    icon?: ReactElement;
    /** The label to display. */
    label: ReactNode;
    /** Tooltip to show when hovering over the label. */
    tooltip?: ReactElement | string;
    /** Intent to apply to the label and border. */
    intent?: Intent;
    /** True to hide the item count in the label. */
    hideItemCount?: boolean;
    /** Additional props to pass to the inner content box. */
    innerBoxProps?: BoxProps;
}

export const [CollapsibleSet, collapsibleSet] = hoistCmp.withFactory<CollapsibleSetProps>({
    displayName: 'CollapsibleSet',
    model: uses(CollapsibleSetModel, {
        fromContext: false,
        publishMode: 'limited',
        createDefault: true
    }),
    className: 'xh-collapsible-set',
    render({
        icon,
        label,
        tooltip,
        intent,
        children,
        hideItemCount,
        className,
        disabled,
        innerBoxProps = {},
        model,
        ...rest
    }) {
        const wasDisplayed = useRef(false),
            {collapsed, renderMode} = model;

        let [layoutProps, {testId, ...restProps}] = splitLayoutProps(rest);

        restProps = mergeDeep({style: layoutProps}, {[TEST_ID]: testId}, restProps);

        const items = castArray(children),
            itemCount = hideItemCount === true ? '' : ` (${items.length})`,
            classes = [];

        if (collapsed) {
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

        if (collapsed) {
            classes.push('xh-collapsible-set--collapsed');
        } else {
            wasDisplayed.current = true;
        }

        let content: ReactNode[];
        switch (renderMode) {
            case 'always':
                content = items;
                classes.push('xh-collapsible-set--render-mode-always');
                break;

            case 'lazy':
                content = collapsed && !wasDisplayed.current ? [] : items;
                classes.push('xh-collapsible-set--render-mode-lazy');
                break;

            // unmountOnHide
            default:
                content = collapsed ? [] : items;
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
                    collapsed,
                    disabled
                }),
                vbox({
                    className: 'xh-collapsible-set__content',
                    items: content,
                    display: collapsed ? 'none' : 'flex',
                    flexWrap: 'wrap',
                    ...innerBoxProps
                })
            ],
            disabled,
            ...restProps
        });
    }
});
