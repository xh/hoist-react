/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    FloatingFocusManager,
    FloatingNode,
    FloatingPortal,
    FloatingTree,
    useFloating,
    useFloatingNodeId,
    useFloatingParentNodeId
} from '@floating-ui/react';
import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {TEST_ID} from '@xh/hoist/utils/js';
import {usePortalContainer} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import type {KeyboardEvent, MouseEvent} from 'react';
import {createElement as h, useId} from 'react';
import type {DialogProps} from '../Dialog';
import {useBodyScrollLock} from './BodyScrollLock';

/** Joins dialogs to Floating UI's tree, so popovers opened within one count as inside it. */
export const dialogImpl = hoistCmp.factory<DialogProps>({
    displayName: 'DialogImpl',
    model: false,

    render(props) {
        const parentId = useFloatingParentNodeId(),
            impl = dialogInner(props);
        return parentId == null ? h(FloatingTree, null, impl) : impl;
    }
});

const dialogInner = hoistCmp.factory<DialogProps>({
    displayName: 'DialogInner',
    model: false,

    render(props) {
        const {
            autoFocus = true,
            canEscapeKeyClose = true,
            canOutsideClickClose = true,
            children,
            className,
            enforceFocus = true,
            icon,
            isCloseButtonShown = true,
            isOpen = false,
            lazy = true,
            onClose,
            shouldReturnFocusOnClose = true,
            style,
            testId,
            title
        } = props;

        const contextContainer = usePortalContainer(),
            // Floating UI renders nothing for a null root - pass undefined for `document.body`.
            portalContainer = props.portalContainer ?? contextContainer ?? undefined,
            titleId = useId(),
            nodeId = useFloatingNodeId(),
            {context, refs} = useFloating({
                nodeId,
                open: isOpen,
                onOpenChange: o => !o && onClose?.()
            });

        useBodyScrollLock(isOpen);

        // The dialog is the innermost layer receiving the key, as any popover within it stops Escape
        // from propagating once it has closed itself.
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && canEscapeKeyClose) {
                e.stopPropagation();
                e.preventDefault();
                onClose?.(e);
            }
        };

        const onBackdropMouseDown = (e: MouseEvent) => {
            if (canOutsideClickClose) onClose?.(e);
        };

        let content = null;
        if (isOpen) {
            const header =
                title != null
                    ? h(
                          'div',
                          {className: 'xh-dialog__header bp6-dialog-header'},
                          icon ?? null,
                          h('h2', {id: titleId, className: 'xh-dialog__title bp6-heading'}, title),
                          isCloseButtonShown
                              ? button({
                                    className: 'xh-dialog__close-button bp6-dialog-close-button',
                                    icon: Icon.close(),
                                    'aria-label': 'Close',
                                    onClick: e => onClose?.(e)
                                })
                              : null
                      )
                    : null;

            const dialogEl = h(
                'div',
                {
                    ref: refs.setFloating,
                    role: 'dialog',
                    'aria-modal': enforceFocus,
                    'aria-labelledby': title != null ? titleId : undefined,
                    className: classNames('xh-dialog', 'bp6-dialog', className),
                    style,
                    tabIndex: -1,
                    [TEST_ID]: testId
                },
                header,
                children
            );

            content = h(
                'div',
                {
                    className:
                        'xh-dialog__overlay bp6-overlay bp6-overlay-open bp6-overlay-scroll-container',
                    onKeyDown
                },
                h('div', {
                    className: 'xh-dialog__backdrop bp6-overlay-backdrop',
                    onMouseDown: onBackdropMouseDown
                }),
                h(
                    'div',
                    {className: 'xh-dialog__container bp6-dialog-container bp6-overlay-content'},
                    h(FloatingFocusManager, {
                        context,
                        modal: enforceFocus,
                        initialFocus: autoFocus ? refs.floating : -1,
                        returnFocus: shouldReturnFocusOnClose,
                        closeOnFocusOut: false,
                        children: dialogEl
                    })
                )
            );
        }

        // A lazy dialog creates its portal when first opened. Otherwise it keeps an empty one.
        const portal = isOpen || !lazy ? h(FloatingPortal, {root: portalContainer}, content) : null;
        return h(FloatingNode, {id: nodeId}, portal);
    }
});
