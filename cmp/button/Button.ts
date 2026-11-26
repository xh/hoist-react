/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PopoverTargetProps} from '@xh/hoist/cmp/popover';
import {spinner} from '@xh/hoist/cmp/spinner';
import {tooltip as tooltipCmp, type TooltipProps} from '@xh/hoist/cmp/tooltip';
import type {
    ComponentSize,
    DomAttrsProps,
    HoistModel,
    HoistProps,
    Intent,
    LayoutProps,
    StyleProps,
    TaskObserver,
    TestSupportProps
} from '@xh/hoist/core';
import {hoistCmp, XH} from '@xh/hoist/core';
import {TEST_ID} from '@xh/hoist/utils/js';
import {composeRefs, isBlankNode, splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {forEach, isBoolean, isString} from 'lodash';
import type {ButtonHTMLAttributes, ReactElement, ReactNode, Ref, SyntheticEvent} from 'react';
import {createElement} from 'react';
import './Button.scss';

export interface ButtonProps<M extends HoistModel = null>
    extends
        HoistProps<M>,
        StyleProps,
        LayoutProps,
        TestSupportProps,
        DomAttrsProps,
        Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
    /** True to draw the button pressed in, as for a toggle that is on or a popover that is open. */
    active?: boolean;
    autoFocus?: boolean;
    disabled?: boolean;
    icon?: ReactElement;
    intent?: Intent;

    /**
     * True to show a spinner and ignore clicks while an operation runs - or a TaskObserver, such
     * as a model's `loadObserver`, to do so while it is pending. The spinner takes the place of
     * the icon, or covers the content of a button without one. The button keeps its size and
     * stays focusable.
     */
    loading?: boolean | TaskObserver;

    /**
     * True to draw the button with no background or border until hovered or pressed. Default
     * true on desktop and false on mobile - set via `Button.defaults.minimal`.
     */
    minimal?: boolean;
    outlined?: boolean;
    rightIcon?: ReactElement;

    /**
     * Size of the button - its height, padding and font size. Default `standard`. Set the
     * `--xh-button-compact-*` and `--xh-button-large-*` CSS variables to tune the other sizes. A
     * ButtonGroup's `size` applies to the buttons in it.
     */
    size?: ComponentSize;

    text?: ReactNode;
    /** Native browser tooltip, set as the button's `title` attribute. */
    title?: string;
    value?: any;

    /**
     * Tooltip shown on hover or keyboard focus - its text, or a config for richer content and
     * options such as `intent` and `position`. Use `title` instead for the browser's own tooltip.
     */
    tooltip?: string | ButtonTooltipConfig;
}

/** Config for a button's `tooltip` - `TooltipProps`, less the props for its target. */
export type ButtonTooltipConfig = Omit<TooltipProps, 'children' | 'renderTarget' | 'targetTagName'>;

export interface ButtonDefaults {
    /** Default for `ButtonProps.minimal`. Unset to default to true on desktop, false on mobile. */
    minimal?: boolean;
    outlined?: boolean;
    size?: ComponentSize;
}

/**
 * A clickable button, with optional icons, intent and text. Adds layout support for top-level
 * sizing and margin/padding props. Relays any other native `<button>` attributes and event
 * handlers to the underlying element.
 *
 * The same component on desktop and mobile. On desktop it renders a native `<button>`. On mobile
 * it renders a `div` with the button role, so it fills a block container and sizes to its content
 * in a flex row, as other Hoist containers do - browsers size a native button to its content
 * whatever its `display`.
 */
export const [Button, button] = hoistCmp.withFactory<ButtonProps, ButtonDefaults>({
    displayName: 'Button',
    model: false,
    className: 'xh-button',
    defaults: {
        minimal: null,
        outlined: false,
        size: 'standard'
    },

    render(props, ref) {
        const [layoutProps, nonLayoutProps] = splitLayoutProps(props),
            {defaults} = Button,
            isMobile = XH.isMobileApp;

        const {
            active,
            autoFocus,
            className,
            disabled,
            icon,
            intent,
            loading,
            minimal = defaults.minimal ?? !isMobile,
            onClick,
            outlined = defaults.outlined,
            rightIcon,
            size = defaults.size,
            style,
            text,
            title,
            tooltip,
            testId,
            domAttrs,
            children,
            ...rest
        } = nonLayoutProps;

        const isLoading = isBoolean(loading) ? loading : !!loading?.isPending,
            hasText = !isBlankNode(text) || !isBlankNode(children),
            tooltipConfig = isString(tooltip) ? {content: tooltip} : tooltip,
            inert = disabled || isLoading;

        const classes = classNames(
            className,
            disabled ? 'xh-button--disabled' : 'xh-button--enabled',
            `xh-button--intent-${intent ?? 'none'}`,
            minimal ? 'xh-button--minimal' : null,
            outlined ? 'xh-button--outlined' : null,
            !minimal && !outlined ? 'xh-button--standard' : null,
            size && size !== 'standard' ? `xh-button--${size}` : null,
            active ? 'xh-button--active' : null,
            isLoading ? 'xh-button--loading' : null,
            isLoading && !icon ? 'xh-button--loading-cover' : null,
            autoFocus ? 'xh-button--autofocus-enabled' : null
        );

        const elProps: Record<string, any> = {
            autoFocus,
            [TEST_ID]: testId,
            ...domAttrs,
            style: {...style, ...layoutProps},
            title,
            'aria-busy': isLoading || undefined,
            ...rest
        };

        // Name an icon-only button for assistive tech from its tooltip text, if it has no other.
        if (
            !hasText &&
            !title &&
            elProps['aria-label'] == null &&
            isString(tooltipConfig?.content)
        ) {
            elProps['aria-label'] = tooltipConfig.content;
        }

        // A loading button stays focusable, so its tooltip and keyboard focus survive - mark it
        // disabled for assistive tech instead, and drop its clicks.
        if (isMobile) {
            Object.assign(elProps, {
                role: 'button',
                'aria-disabled': inert || undefined,
                onClick: inert ? null : onClick
            });
        } else {
            Object.assign(elProps, {
                type: 'button',
                disabled,
                'aria-disabled': isLoading || undefined,
                onClick: isLoading ? null : onClick,
                tabIndex: disabled ? -1 : elProps.tabIndex
            });
        }

        const content = [
            isLoading && icon
                ? spinner({compact: true, className: 'xh-button__spinner', key: 'icon'})
                : (icon ?? null),
            hasText
                ? createElement('span', {className: 'xh-button__text', key: 'text'}, text, children)
                : null,
            rightIcon ?? null,
            isLoading && !icon
                ? spinner({compact: true, className: 'xh-button__spinner', key: 'cover'})
                : null
        ];

        const renderButton = (targetProps?: PopoverTargetProps) =>
            createElement(
                isMobile ? 'div' : 'button',
                {
                    ...elProps,
                    ...(targetProps ? targetHandlers(targetProps, elProps) : null),
                    ref: targetProps ? composeRefs(ref as Ref<HTMLElement>, targetProps.ref) : ref,
                    className: classes
                },
                ...content
            );

        if (isBlankNode(tooltipConfig?.content as ReactNode)) return renderButton();

        return tooltipCmp({
            hoverOpenDelay: TOOLTIP_OPEN_DELAY,
            ...tooltipConfig,
            renderTarget: renderButton
        });
    }
});

//------------------------
// Implementation
//------------------------
// Longer than a standalone tooltip's, so tooltips do not flash up as the pointer crosses a toolbar.
const TOOLTIP_OPEN_DELAY = 500;

// Tooltip handlers for the button, keyed by the button prop that runs each. Pointer rather than
// mouse enter and leave, which React drops for a disabled button - so its tooltip still shows.
const TOOLTIP_HANDLERS = {
    onPointerEnter: 'onMouseEnter',
    onPointerLeave: 'onMouseLeave',
    onPointerDown: 'onPointerDown',
    onFocus: 'onFocus',
    onBlur: 'onBlur'
};

// The tooltip's hover and focus handlers, each run after any the app set on the button.
function targetHandlers(targetProps: PopoverTargetProps, buttonProps: Record<string, any>) {
    const ret = {};
    forEach(TOOLTIP_HANDLERS, (tooltipName, name) => {
        const tooltipFn = targetProps[tooltipName],
            buttonFn = buttonProps[name];
        if (!tooltipFn) return;
        ret[name] = buttonFn
            ? (e: SyntheticEvent) => {
                  buttonFn(e);
                  tooltipFn(e);
              }
            : tooltipFn;
    });
    return ret;
}
