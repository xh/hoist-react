/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {box, div, fieldset} from '@xh/hoist/cmp/layout';
import type {
    BoxProps,
    DomAttrsProps,
    HoistProps,
    Intent,
    LayoutProps,
    TestSupportProps
} from '@xh/hoist/core';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {cardHeaderImpl as desktopCardHeaderImpl} from '@xh/hoist/dynamics/desktop';
import {cardHeaderImpl as mobileCardHeaderImpl} from '@xh/hoist/dynamics/mobile';
import {mergeDeep, TEST_ID, warnIf} from '@xh/hoist/utils/js';
import {isBlankNode, splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {type ReactElement, type ReactNode, useId, useRef} from 'react';
import {CardModel} from './CardModel';
import {cardHeaderItems} from './impl/CardHeaderParts';
import './Card.scss';

export interface CardProps<M extends CardModel = CardModel>
    extends HoistProps<M>, TestSupportProps, DomAttrsProps, LayoutProps {
    /** An icon placed left of the title. */
    icon?: ReactElement;
    /** Intent to apply to the inline header and border. */
    intent?: Intent;
    /** The title to display. */
    title?: ReactNode;
    /**
     * Muted text after the title, for example a row count or the units of the content. A blank
     * subtitle renders nothing.
     */
    subtitle?: ReactNode;
    /**
     * Items at the far end of the inline header, for example buttons or a badge. With header
     * items, the header spans the width of the card. Blank items are left out.
     *
     * The card is named by its title, icon and subtitle for screen readers, not by its header
     * items. A card with header items and no title has no name of its own: pass an `aria-label`
     * through `domAttrs`. An `aria-label` or `aria-labelledby` in `domAttrs` always wins.
     */
    headerItems?: ReactNode[];
    /**
     * A row under the content, set apart by a rule, for example for actions or a summary. Hidden
     * while the card is collapsed, and kept mounted or not per the model's `renderMode`, as the
     * content is. A blank footer renders nothing.
     */
    footer?: ReactNode;
    /** Tooltip to show when hovering over the inline header. */
    tooltip?: ReactElement | string;
    /** Additional props to pass to the inner box hosting the content. */
    contentBoxProps?: BoxProps;
}

/**
 * A bordered container for grouping related content, rendered as an HTML fieldset/legend.
 * Supports an optional inline header (`title`, `subtitle`, `icon`, `intent`, `headerItems`), an
 * optional `footer` and user-driven collapse/expand via its backing {@link CardModel}.
 *
 * Children are arranged vertically in a flexbox container by default - pass
 * `contentBoxProps` to customize the content layout.
 *
 * @see CardModel
 * @see FormFieldSet
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
        subtitle,
        headerItems,
        footer,
        tooltip,
        intent,
        children,
        className,
        contentBoxProps = {},
        model,
        ...rest
    }) {
        const {isMobileApp} = XH;
        warnIf(tooltip && isMobileApp, 'Tooltips are not supported on mobile - will be ignored.');

        const wasDisplayed = useRef(false),
            headerId = useId(),
            shownHeaderItems = cardHeaderItems(headerItems),
            hasHeader = model.collapsible || !!icon || !!title || !isBlankNode(subtitle),
            {collapsed, renderMode} = model;

        let [layoutProps, {testId, domAttrs, ...restProps}] = splitLayoutProps(rest);

        // A legend that holds header items would add them to the card's name. A name from the app
        // takes precedence.
        const namedByApp =
            domAttrs?.['aria-label'] != null || domAttrs?.['aria-labelledby'] != null;
        restProps = mergeDeep(
            {style: layoutProps},
            shownHeaderItems.length && hasHeader && !namedByApp
                ? {'aria-labelledby': headerId}
                : {},
            {[TEST_ID]: testId, ...domAttrs},
            restProps
        );

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

        // Content and footer stay mounted while collapsed per the render mode.
        const isMounted =
            !collapsed ||
            renderMode === 'always' ||
            (renderMode === 'lazy' && wasDisplayed.current);

        return fieldset({
            className: classNames(className, classes),
            items: [
                cardHeader({
                    icon,
                    intent,
                    model,
                    title,
                    subtitle,
                    headerItems: shownHeaderItems,
                    headerId,
                    tooltip
                }),
                box({
                    ...contentBoxProps,
                    className: classNames('xh-card__content', contentBoxProps?.className),
                    items: isMounted ? children : [],
                    display: collapsed ? 'none' : 'flex'
                }),
                div({
                    omit: isBlankNode(footer) || !isMounted,
                    className: 'xh-card__footer',
                    style: collapsed ? {display: 'none'} : null,
                    item: footer
                })
            ],
            ...restProps
        });
    }
});
