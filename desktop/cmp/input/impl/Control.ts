/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import type {CSSProperties, InputHTMLAttributes, ReactNode, Ref} from 'react';
import {createElement} from 'react';

export interface ControlProps {
    /** Kind of control - its class names come from this. */
    kind: 'checkbox' | 'radio' | 'switch';

    /** Side of the label the indicator sits on. */
    alignIndicator?: 'left' | 'right';

    /** True to lay out inline, next to sibling controls. */
    inline?: boolean;

    /** Text or element shown beside the indicator. */
    label?: ReactNode;

    className?: string;
    style?: CSSProperties;

    /** Ref to the outer `<label>`. */
    ref?: Ref<HTMLLabelElement>;

    /** Ref to the native `<input>`. */
    inputRef?: Ref<HTMLInputElement>;

    /** Props for the native `<input>`, including its event handlers and `data-*` attributes. */
    inputProps: InputHTMLAttributes<HTMLInputElement> & Record<string, any>;
}

/**
 * A native checkbox or radio input styled as a checkbox, radio button or switch, wrapped in a
 * `<label>` with its indicator and label text. Renders the same elements and class names as
 * Blueprint's controls, so their styles and any app CSS keyed to them still apply.
 * @internal
 */
export function control({
    kind,
    alignIndicator,
    inline,
    label,
    className,
    style,
    ref,
    inputRef,
    inputProps
}: ControlProps) {
    return createElement(
        'label',
        {
            ref,
            style,
            className: classNames(
                'xh-control',
                `xh-control--${kind}`,
                'bp6-control',
                `bp6-${kind}`,
                {
                    'bp6-disabled': inputProps.disabled,
                    'bp6-inline': inline,
                    [`bp6-align-${alignIndicator}`]: alignIndicator
                },
                className
            )
        },
        createElement('input', {
            ...inputProps,
            className: 'xh-control__input bp6-control-input',
            ref: inputRef,
            type: kind === 'radio' ? 'radio' : 'checkbox'
        }),
        createElement('span', {className: 'xh-control__indicator bp6-control-indicator'}),
        label ?? null
    );
}
