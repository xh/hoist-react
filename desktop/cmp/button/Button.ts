/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {
    DomAttrsProps,
    HoistModel,
    HoistProps,
    Intent,
    LayoutProps,
    StyleProps,
    TestSupportProps
} from '@xh/hoist/core';
import type {PopoverTargetProps} from '@xh/hoist/cmp/popover';
import {tooltip as tooltipCmp, type TooltipProps} from '@xh/hoist/cmp/tooltip';
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {TEST_ID} from '@xh/hoist/utils/js';
import {composeRefs, splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {forEach, isArray, isString} from 'lodash';
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
    /** True to draw the button pressed in, as for a toggle that is on. */
    active?: boolean;
    autoFocus?: boolean;
    disabled?: boolean;
    icon?: ReactElement;
    intent?: Intent;
    minimal?: boolean;
    outlined?: boolean;
    rightIcon?: ReactElement;
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
    minimal?: boolean;
    outlined?: boolean;
}

/**
 * A clickable button, with optional icons, intent and text. Defaults to the `minimal` style for
 * reduced chrome and adds layout support for top-level sizing and margin/padding props.
 *
 * Relays any other native `<button>` attributes and event handlers to the underlying element.
 */
export const [Button, button] = hoistCmp.withFactory<ButtonProps, ButtonDefaults>({
    displayName: 'Button',
    model: false,
    className: 'xh-button',
    defaults: {
        minimal: true,
        outlined: false
    },

    render(props, ref) {
        const [layoutProps, nonLayoutProps] = splitLayoutProps(props),
            classes = [],
            {defaults} = Button;

        const {
            autoFocus,
            className,
            disabled,
            icon,
            intent,
            minimal = defaults.minimal,
            onClick,
            outlined = defaults.outlined,
            rightIcon,
            style,
            text,
            title,
            tooltip,
            active,
            testId,
            domAttrs,
            children,
            ...rest
        } = nonLayoutProps;

        if (autoFocus) classes.push('xh-button--autofocus-enabled');

        if (disabled) {
            classes.push('xh-button--disabled');
        } else {
            classes.push('xh-button--enabled');
        }

        if (intent) {
            classes.push(`xh-button--intent-${intent}`);
        } else {
            classes.push(`xh-button--intent-none`);
        }

        if (minimal) classes.push('xh-button--minimal');
        if (outlined) classes.push('xh-button--outlined');
        if (!minimal && !outlined) classes.push('xh-button--standard');
        if (active) classes.push('xh-button--active');

        const nativeProps = {
            autoFocus,
            [TEST_ID]: testId,
            ...domAttrs,
            disabled,
            onClick,
            style: {
                ...style,
                ...layoutProps
            },
            title,
            ...rest
        };

        // Blueprint's class names are kept, so its styles and app CSS keyed to them apply.
        const hasText = !isEmptyNode(text) || !isEmptyNode(children);
        const renderButton = (targetProps?: PopoverTargetProps) =>
            createElement(
                'button',
                {
                    type: 'button',
                    ...nativeProps,
                    ...(targetProps ? targetHandlers(targetProps, nativeProps) : null),
                    tabIndex: disabled ? -1 : nativeProps.tabIndex,
                    ref: targetProps ? composeRefs(ref as Ref<HTMLElement>, targetProps.ref) : ref,
                    className: classNames(
                        'bp6-button',
                        {
                            'bp6-active': active,
                            'bp6-disabled': disabled,
                            [`bp6-intent-${intent}`]: intent,
                            'bp6-minimal': minimal,
                            'bp6-outlined': outlined
                        },
                        className,
                        classes
                    )
                },
                icon ?? null,
                hasText
                    ? createElement(
                          'span',
                          {className: 'xh-button__text bp6-button-text'},
                          text,
                          children
                      )
                    : null,
                rightIcon ?? null
            );

        const tooltipConfig = isString(tooltip) ? {content: tooltip} : tooltip;
        if (isEmptyNode(tooltipConfig?.content as ReactNode)) return renderButton();

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

function isEmptyNode(node: ReactNode): boolean {
    return (
        node == null ||
        node === '' ||
        node === false ||
        (isArray(node) && node.every(it => isEmptyNode(it)))
    );
}
