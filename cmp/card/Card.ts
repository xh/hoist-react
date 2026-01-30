/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {box, div, fieldset, legend} from '@xh/hoist/cmp/layout';
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
import {collapseToggleButton as desktopCollapseToggleButtonImpl} from '@xh/hoist/dynamics/desktop';
import {collapseToggleButton as mobileCollapseToggleButtonImpl} from '@xh/hoist/dynamics/mobile';
import {tooltip as bpTooltip} from '@xh/hoist/kit/blueprint';
import {mergeDeep, TEST_ID} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {castArray} from 'lodash';
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
    /** Additional props to pass to the inner content box. */
    innerBoxProps?: BoxProps;
}

/**
 * A bounded container for grouping related content, with optional inline header and collapsibility.
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
        const wasDisplayed = useRef(false),
            {collapsible, collapsed, renderMode} = model;

        let [layoutProps, {testId, ...restProps}] = splitLayoutProps(rest);

        restProps = mergeDeep({style: layoutProps}, {[TEST_ID]: testId}, restProps);

        const items = castArray(children),
            classes = [];

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

        const collapseToggleButton = XH.isMobileApp
            ? mobileCollapseToggleButtonImpl
            : desktopCollapseToggleButtonImpl;

        let content: ReactNode[];
        switch (renderMode) {
            case 'always':
                content = items;
                break;

            case 'lazy':
                content = collapsed && !wasDisplayed.current ? [] : items;
                break;

            // unmountOnHide
            default:
                content = collapsed ? [] : items;
                break;
        }

        return fieldset({
            className: classNames(className, classes),
            items: [
                collapsible
                    ? collapseToggleButton({
                          icon,
                          text: title,
                          tooltip,
                          intent,
                          cardModel: model
                      })
                    : cardTitle({icon, title, tooltip, intent}),
                box({
                    className: 'xh-card__inner',
                    items: content,
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

interface CardTitleProps extends HoistProps {
    icon?: ReactElement;
    intent?: Intent;
    title?: ReactNode;
    tooltip?: ReactElement | string;
}

const cardTitle = hoistCmp.factory<CardTitleProps>({
    displayName: 'CardTitle',
    className: 'xh-card__header',
    model: false,

    render({className, icon, intent, title, tooltip}) {
        if (!icon && !title) return null;

        const header = div({
            className: classNames(className, `xh-card__header--intent-${intent ?? 'none'}`),
            items: [icon, title]
        });

        return legend(tooltip ? bpTooltip({item: header, content: tooltip, intent}) : header);
    }
});
