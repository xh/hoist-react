/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import classNames from 'classnames';
import type {CSSProperties, InputHTMLAttributes, ReactElement, ReactNode, Ref} from 'react';
import {createElement as h, useLayoutEffect, useRef, useState} from 'react';

export interface InputGroupProps extends InputHTMLAttributes<HTMLInputElement> {
    /** Ref to the native `<input>`. */
    inputRef?: Ref<HTMLInputElement>;

    /** Element inside the input, at its left - takes precedence over `leftIcon`. */
    leftElement?: ReactNode;

    /** Icon inside the input, at its left. */
    leftIcon?: ReactElement;

    /** Element inside the input, at its right - e.g. a clear button. */
    rightElement?: ReactNode;

    /** True for rounded ends. */
    round?: boolean;

    /** Class name for the outer element. */
    groupClassName?: string;

    /** Styles for the native `<input>`. */
    style?: CSSProperties;
}

/**
 * A native text input with optional elements inside it at either end, padded so typed text does
 * not run under them. Renders the same elements and class names as Blueprint's `InputGroup`, so
 * its styles and any app CSS keyed to them still apply.
 * @internal
 */
export const inputGroup = hoistCmp.factory<InputGroupProps>({
    displayName: 'InputGroup',
    model: false,
    observer: false,

    render(props) {
        const {
                disabled,
                groupClassName,
                inputRef,
                leftElement,
                leftIcon,
                readOnly,
                rightElement,
                round,
                style,
                ...inputProps
            } = props,
            leftRef = useRef<HTMLSpanElement>(null),
            rightRef = useRef<HTMLSpanElement>(null),
            [padding, setPadding] = useState<{left: number; right: number}>({
                left: null,
                right: null
            });

        // Pad the input by the width of the elements within it, re-measured after every render as
        // they may change. A small threshold stops the state update from looping.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        useLayoutEffect(() => {
            const left = leftRef.current?.clientWidth ?? null,
                right = rightRef.current?.clientWidth ?? null;
            if (changed(padding.left, left) || changed(padding.right, right)) {
                setPadding({left, right});
            }
        });

        let left: ReactNode = null;
        if (leftElement != null) {
            left = h('span', {className: 'bp6-input-left-container', ref: leftRef}, leftElement);
        } else if (leftIcon != null) {
            left = leftIcon;
        }

        return h(
            'div',
            {
                className: classNames('xh-input-group', 'bp6-input-group', groupClassName, {
                    'bp6-disabled': disabled,
                    'bp6-read-only': readOnly,
                    'bp6-round': round
                })
            },
            left,
            h('input', {
                type: 'text',
                ...inputProps,
                disabled,
                readOnly,
                'aria-disabled': disabled,
                className: 'xh-input-group__input bp6-input',
                ref: inputRef,
                style: {
                    ...style,
                    paddingLeft: padding.left ?? undefined,
                    paddingRight: padding.right ?? undefined
                }
            }),
            rightElement != null
                ? h('span', {className: 'bp6-input-action', ref: rightRef}, rightElement)
                : null
        );
    }
});

function changed(prev: number, next: number): boolean {
    if (prev == null || next == null) return prev !== next;
    return Math.abs(prev - next) > 2;
}
