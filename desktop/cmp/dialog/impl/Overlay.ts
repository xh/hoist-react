/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {FloatingPortal} from '@floating-ui/react';
import {elementFactory} from '@xh/hoist/core';
import {usePortalContainer} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import type {FC, KeyboardEvent, ReactElement, ReactNode} from 'react';
import {Children, cloneElement, createElement as h, isValidElement, useEffect, useRef} from 'react';
import {useBodyScrollLock} from './BodyScrollLock';

export interface OverlayProps {
    isOpen?: boolean;
    className?: string;
    /** The single element to show over the backdrop. */
    children?: ReactNode;
    /** False to omit the backdrop. Default true. */
    hasBackdrop?: boolean;
    /** True to focus the content when it opens. Default false. */
    autoFocus?: boolean;
    /** True to close via `onClose` when Escape is pressed. Default false. */
    canEscapeKeyClose?: boolean;
    onClose?: () => void;
    /** False to render inline, filling the nearest positioned ancestor. Default true. */
    usePortal?: boolean;
}

/**
 * A layer over the page, or over its container when `usePortal` is false, with an optional
 * backdrop. Hoist's masks and empty-dashboard prompts show in it.
 * @internal
 */
const OverlayImpl: FC<OverlayProps> = ({
    autoFocus = false,
    canEscapeKeyClose = false,
    children,
    className,
    hasBackdrop = true,
    isOpen = false,
    onClose,
    usePortal = true
}) => {
    const contextContainer = usePortalContainer(),
        contentRef = useRef<HTMLElement>(null);

    useBodyScrollLock(isOpen && usePortal && hasBackdrop);

    useEffect(() => {
        if (isOpen && autoFocus) contentRef.current?.focus();
    }, [isOpen, autoFocus]);

    if (!isOpen) return null;

    const child = Children.toArray(children)[0],
        content = isValidElement(child)
            ? cloneElement(child as ReactElement<any>, {
                  ref: contentRef,
                  tabIndex: autoFocus ? 0 : undefined,
                  className: classNames(
                      (child as ReactElement<any>).props.className,
                      'xh-overlay__content bp6-overlay-content'
                  )
              })
            : child;

    const layer = h(
        'div',
        {
            className: classNames('xh-overlay', 'bp6-overlay', 'bp6-overlay-open', className, {
                'xh-overlay--inline bp6-overlay-inline': !usePortal
            }),
            'aria-live': 'polite',
            onKeyDown: (e: KeyboardEvent) => {
                if (e.key === 'Escape' && canEscapeKeyClose) {
                    e.stopPropagation();
                    onClose?.();
                }
            }
        },
        hasBackdrop ? h('div', {className: 'xh-overlay__backdrop bp6-overlay-backdrop'}) : null,
        content
    );

    return usePortal ? h(FloatingPortal, {root: contextContainer ?? undefined}, layer) : layer;
};

export const overlay = elementFactory(OverlayImpl);

/** Class for an overlay that scrolls its content, as Blueprint's `Classes.OVERLAY_SCROLL_CONTAINER`. */
export const OVERLAY_SCROLL_CONTAINER = 'xh-overlay--scroll-container bp6-overlay-scroll-container';
