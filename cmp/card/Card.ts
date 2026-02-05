/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {box, fieldset} from '@xh/hoist/cmp/layout';
import {
    BoxProps,
    hoistCmp,
    HoistProps,
    Intent,
    LayoutProps,
    TestSupportProps,
    uses,
    XH
} from '@xh/hoist/core';
import {cardHeaderImpl as desktopCardHeaderImpl} from '@xh/hoist/dynamics/desktop';
import {cardHeaderImpl as mobileCardHeaderImpl} from '@xh/hoist/dynamics/mobile';
import {mergeDeep, TEST_ID, warnIf} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {type ReactElement, type ReactNode, useRef} from 'react';
import {CardModel} from './CardModel';
import './Card.scss';

export interface CardProps extends HoistProps<CardModel>, TestSupportProps, LayoutProps {
    /** An icon placed left of the title. */
    icon?: ReactElement;
    /** Intent to apply to the inline header and border. */
    intent?: Intent;
    /** The title to display. */
    title?: ReactNode;
    /** Tooltip to show when hovering over the inline header. */
    tooltip?: ReactElement | string;
    /** Additional props to pass to the inner box hosting the content. */
    innerBoxProps?: BoxProps;
}

/**
 * A bordered container for grouping related content with optional inline header and collapsibility.
 * Children are arranged vertically in a flexbox container by default. innerBoxProps can be
 * passed to control the flex direction and other layout aspects of the inner container.
 * This component leverages an HTML fieldset and legend to provide base styling.
 */
export const [Card, card] = hoistCmp.withFactory<CardProps>({
    displayName: 'Card',
    model: uses(CardModel, {
        fromContext: false,
        publishMode: 'limited',
        createDefault: true
    }),
    className: 'xh-card',
    render({
        icon,
        title,
        tooltip,
        intent,
        children,
        className,
        innerBoxProps = {},
        model,
        ...rest
    }) {
        const {isMobileApp} = XH;
        warnIf(tooltip && isMobileApp, 'Tooltips are not supported on mobile - will be ignored.');

        const wasDisplayed = useRef(false),
            {collapsed, renderMode} = model;

        let [layoutProps, {testId, ...restProps}] = splitLayoutProps(rest);

        restProps = mergeDeep({style: layoutProps}, {[TEST_ID]: testId}, restProps);

        const classes: string[] = [];

        if (collapsed) {
            classes.push('xh-card--collapsed');
        } else {
            classes.push('xh-card--expanded');
            wasDisplayed.current = true;
        }

        if (intent) {
            classes.push(`xh-card--intent-${intent}`);
        } else {
            classes.push(`xh-card--intent-none`);
        }

        const cardHeader = XH.isMobileApp ? mobileCardHeaderImpl : desktopCardHeaderImpl;

        const items: ReactNode = (() => {
            switch (renderMode) {
                case 'always':
                    return children;
                case 'lazy':
                    return collapsed && !wasDisplayed.current ? [] : children;
                case 'unmountOnHide':
                    return collapsed ? [] : children;
            }
        })();

        return fieldset({
            className: classNames(className, classes),
            items: [
                cardHeader({
                    icon,
                    intent,
                    model,
                    title,
                    tooltip
                }),
                box({
                    className: 'xh-card__inner',
                    items,
                    display: collapsed ? 'none' : 'flex',
                    flexDirection: 'column',
                    flexWrap: 'wrap',
                    ...innerBoxProps
                })
            ],
            ...restProps
        });
    }
});
