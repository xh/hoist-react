/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import classNames from 'classnames';
import {useId} from 'react';
import type {ReactElement, ReactNode} from 'react';

import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import type {
    ComponentSize,
    DomAttrsProps,
    HoistProps,
    Intent,
    LayoutProps,
    TestSupportProps
} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {mergeDeep, TEST_ID} from '@xh/hoist/utils/js';
import {isBlankNode, splitLayoutProps} from '@xh/hoist/utils/react';

import './Callout.scss';

export interface CalloutProps extends HoistProps, LayoutProps, TestSupportProps, DomAttrsProps {
    /**
     * Semantic color and default icon - `primary` for a note, `success`, `warning` or `danger`.
     * Default none, for a neutral callout with no icon.
     */
    intent?: Intent;

    /**
     * Icon shown before the text. Default a standard icon for the `intent`: info, success,
     * warning or danger, titled to name the intent to screen readers. A callout with no intent
     * has no default icon. False for no icon.
     */
    icon?: ReactElement | false;

    /**
     * Size of the callout - `compact` for less padding and smaller text, to fit a dense form,
     * dialog or side panel. Default `standard`. Set the `--xh-callout-compact-*` CSS variables to
     * tune the compact size.
     */
    size?: Extract<ComponentSize, 'compact' | 'standard'>;

    /** Short heading shown above the body. */
    title?: ReactNode;

    /**
     * Body of the callout, usually a sentence or two. A string renders as plain text - pass a
     * `markdown()` element to render markdown.
     */
    children?: ReactNode;
}

/**
 * A short note set off within a body of content, such as a caveat in a form or a warning above
 * a grid. It shows an icon, an optional title and a body on a background tinted by its intent.
 *
 * The callout is presentation-only. It is a block with no outer margin, so it fills the width of a
 * block or a column. In a row such as an `hbox`, give it a `flex` or a `width`. Its text wraps.
 *
 * A blank title or body renders nothing, and a callout with neither renders nothing at all.
 *
 * Use a `Banner` for a status strip in app or panel chrome, with close and action buttons.
 */
export const [Callout, callout] = hoistCmp.withFactory<CalloutProps>({
    displayName: 'Callout',
    model: false,
    observer: false,
    className: 'xh-callout',

    render(props, ref) {
        const [layoutProps, {className, intent, icon, size, title, children, testId, domAttrs}] =
                splitLayoutProps(props),
            titleId = useId(),
            hasTitle = !isBlankNode(title),
            hasBody = !isBlankNode(children),
            shownIcon =
                icon === false
                    ? null
                    : (icon ?? Icon.forIntent(intent, {title: INTENT_LABELS[intent]}));

        if (!hasTitle && !hasBody) return null;

        return div({
            ref,
            role: 'note',
            'aria-labelledby': hasTitle ? titleId : null,
            ...mergeDeep(
                {
                    className: classNames(
                        className,
                        intent && `xh-callout--intent-${intent}`,
                        size === 'compact' && 'xh-callout--compact'
                    )
                },
                {style: layoutProps},
                {[TEST_ID]: testId, ...domAttrs}
            ),
            children: [
                div({omit: !shownIcon, className: 'xh-callout__icon', children: shownIcon}),
                div({
                    className: 'xh-callout__content',
                    children: [
                        div({
                            omit: !hasTitle,
                            id: titleId,
                            className: 'xh-callout__title',
                            children: title
                        }),
                        div({omit: !hasBody, className: 'xh-callout__body', children})
                    ]
                })
            ]
        });
    }
});

//------------------
// Implementation
//------------------
/** The icon is the signal of the intent that reaches a screen reader, so it takes a title. */
const INTENT_LABELS: Record<Intent, string> = {
    primary: 'Info',
    success: 'Success',
    warning: 'Warning',
    danger: 'Error'
};
