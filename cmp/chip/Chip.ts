/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {isString} from 'lodash';
import type {KeyboardEvent, MouseEvent, ReactElement} from 'react';

import {div, htmlButton, span} from '@xh/hoist/cmp/layout';
import type {BoxProps, ComponentSize, HoistProps, Intent} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {TEST_ID, mergeDeep} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';

import './Chip.scss';

export type ChipEvent = MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>;

export interface ChipProps extends HoistProps, BoxProps {
    /** Icon shown before the content. */
    icon?: ReactElement;

    /** Icon shown after the content, before any remove button. */
    rightIcon?: ReactElement;

    intent?: Intent;

    /**
     * Any CSS color, for categories the intents don't cover - e.g. `'var(--xh-purple)'`. Takes
     * precedence over `intent`.
     */
    color?: string;

    /** True for a tinted background with colored text. */
    minimal?: boolean;

    /** True for a border with colored text and no fill. */
    outlined?: boolean;

    /** Default 'standard'. */
    size?: ComponentSize;

    /** True for fully rounded ends. */
    round?: boolean;

    /**
     * Makes the chip a button - focusable, with Enter and Space calling this handler. Those keys
     * stop propagating once handled.
     */
    onClick?: (e: ChipEvent) => void;

    /**
     * Selected state for a toggle chip. Renders a minimal or outlined chip filled, and sets
     * `aria-pressed` when the chip is clickable.
     */
    active?: boolean;

    /**
     * Shows a remove button, which never also fires `onClick`. Backspace or Delete on the focused
     * chip or its button also call this handler, and stop propagating once handled. On a clickable
     * chip the button is pointer-only, leaving the chip as the one tab stop.
     */
    onRemove?: (e: ChipEvent) => void;

    /** True to show the chip dimmed and ignore all interaction. */
    disabled?: boolean;
}

/**
 * A compact label for a status, category or value - alone, in a row of chips, or in a grid cell.
 * It can be clickable, toggled with `active`, and removable.
 *
 * Renders inline with no outer margin. In a flex container such as an `hbox`, set a `gap`. Its text
 * truncates with an ellipsis when constrained, e.g. by `maxWidth`, so set `title` for the full text.
 *
 * Use a `Badge` for a count or marker attached to other content.
 */
export const [Chip, chip] = hoistCmp.withFactory<ChipProps>({
    displayName: 'Chip',
    model: false,
    observer: false,
    className: 'xh-chip',

    render(props, ref) {
        const [
                layoutProps,
                {
                    className,
                    style,
                    intent,
                    color,
                    minimal,
                    outlined,
                    size,
                    round,
                    icon,
                    rightIcon,
                    active,
                    disabled,
                    onClick,
                    onRemove,
                    onKeyDown,
                    children,
                    testId,
                    domAttrs,
                    ...restProps
                }
            ] = splitLayoutProps(props),
            clickable = !!onClick && !disabled;

        const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
            onKeyDown?.(e);
            if (disabled || e.defaultPrevented) return;

            const {key} = e,
                onChip = e.target === e.currentTarget;
            if (onRemove && (key === 'Backspace' || key === 'Delete')) {
                e.preventDefault();
                onRemove(e);
            } else if (key === 'Enter' || key === ' ') {
                if (onChip && !onClick) return;
                // On the remove button, the browser clicks it natively.
                if (onChip) {
                    e.preventDefault();
                    onClick(e);
                }
            } else {
                return;
            }
            e.stopPropagation();
        };

        const handleRemoveClick = (e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onRemove(e);
        };

        const divProps = mergeDeep(
            {
                className: classNames(
                    className,
                    color ? 'xh-chip--custom' : intent && `xh-chip--intent-${intent}`,
                    minimal && 'xh-chip--minimal',
                    outlined && 'xh-chip--outlined',
                    active && 'xh-chip--active',
                    size && size !== 'standard' && `xh-chip--${size}`,
                    round && 'xh-chip--round',
                    clickable && 'xh-chip--clickable',
                    disabled && 'xh-chip--disabled'
                )
            },
            {style: {...style, ...layoutProps, ...(color ? {'--xh-chip-color': color} : null)}},
            {[TEST_ID]: testId, ...domAttrs},
            restProps
        );

        return div({
            ref,
            ...divProps,
            role: onClick ? 'button' : undefined,
            tabIndex: clickable ? 0 : undefined,
            'aria-pressed': onClick && active != null ? active : undefined,
            'aria-disabled': disabled || undefined,
            onClick: clickable ? (e: MouseEvent<HTMLDivElement>) => onClick(e) : undefined,
            onKeyDown: handleKeyDown,
            children: [
                icon,
                span({className: 'xh-chip__text', children}),
                rightIcon,
                onRemove
                    ? htmlButton({
                          type: 'button',
                          className: 'xh-chip__remove',
                          'aria-label': removeLabel(children, props.title),
                          // A clickable chip is the one tab stop - Backspace or Delete remove it.
                          'aria-hidden': clickable || undefined,
                          tabIndex: clickable ? -1 : undefined,
                          disabled,
                          onClick: handleRemoveClick,
                          children: Icon.x()
                      })
                    : null
            ]
        });
    }
});

//------------------
// Implementation
//------------------
function removeLabel(children: unknown, title: string): string {
    const name = isString(children) ? children : title;
    return name ? `Remove ${name}` : 'Remove';
}
