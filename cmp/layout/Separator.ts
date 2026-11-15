/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {useId} from 'react';
import type {ReactNode} from 'react';

import {hoistCmp} from '@xh/hoist/core';
import type {DomAttrsProps, HoistProps, LayoutProps, TestSupportProps} from '@xh/hoist/core';
import {mergeDeep, TEST_ID} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';

import {div, span} from './Tags';
import './Separator.scss';

export interface SeparatorProps extends HoistProps, LayoutProps, TestSupportProps, DomAttrsProps {
    /**
     * Direction of the rule. Default `horizontal`, a rule across the width of its container that
     * divides content above from content below. Use `vertical` to divide the items of a row, such
     * as an `hbox` - the rule takes the height of the row.
     */
    orientation?: 'horizontal' | 'vertical';

    /** Caption shown within the rule, e.g. the title of the section that follows. */
    label?: ReactNode;

    /**
     * Where the label sits along the rule. Default `center`, with the rule drawn on each side of
     * the label. With `start` the rule follows the label, and with `end` it leads up to it.
     */
    labelPosition?: 'start' | 'center' | 'end';
}

/**
 * A rule that divides content, with an optional label.
 *
 * The separator has no outer margin by default. Space it with a `gap` on its container, a
 * `margin` layout prop, or the `--xh-separator-margin` CSS variable.
 *
 * For a divider between toolbar items, use `toolbarSep` from `@xh/hoist/desktop/cmp/toolbar`.
 */
export const [Separator, separator] = hoistCmp.withFactory<SeparatorProps>({
    displayName: 'Separator',
    model: false,
    observer: false,
    className: 'xh-separator',

    render(props, ref) {
        const [
                layoutProps,
                {className, orientation, label, labelPosition = 'center', testId, domAttrs}
            ] = splitLayoutProps(props),
            labelId = useId(),
            vertical = orientation === 'vertical',
            hasLabel = label != null && label !== '';

        return div({
            ref,
            role: 'separator',
            'aria-orientation': vertical ? 'vertical' : 'horizontal',
            'aria-labelledby': hasLabel ? labelId : undefined,
            ...mergeDeep(
                {
                    className: classNames(
                        className,
                        `xh-separator--${vertical ? 'vertical' : 'horizontal'}`,
                        hasLabel && `xh-separator--label-${labelPosition}`
                    )
                },
                {style: layoutProps},
                {[TEST_ID]: testId, ...domAttrs}
            ),
            item: hasLabel
                ? span({id: labelId, className: 'xh-separator__label', item: label})
                : null
        });
    }
});
