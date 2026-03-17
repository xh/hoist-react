/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {box, div, vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, LayoutProps, TestSupportProps, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import classNames from 'classnames';
import React, {type ReactElement, type ReactNode, useCallback} from 'react';
import {DrawerModel} from './DrawerModel';
import './Drawer.scss';

export interface DrawerProps extends HoistProps<DrawerModel>, TestSupportProps, LayoutProps {
    /** Title for the drawer header, displayed in both pinned and overlay modes. */
    title?: ReactNode;

    /** Icon displayed at the left of the drawer header. */
    icon?: ReactElement;

    /** Show close button in the overlay header. Default true. */
    isCloseButtonShown?: boolean;

    /** Allow ESC key to close the overlay. Default true. */
    canEscapeKeyClose?: boolean;

    /** Allow clicking the backdrop to close the overlay. Default true. */
    canOutsideClickClose?: boolean;

    /** Show a semi-transparent backdrop behind the overlay. Default true. */
    hasBackdrop?: boolean;

    /**
     * Items to display in the collapsed vertical toolbar strip. If omitted, collapsed mode
     * renders nothing and the drawer is completely invisible.
     */
    collapsedItems?: ReactNode[];

    /**
     * Side of the parent panel this drawer is attached to.
     * Set automatically by Panel when provided via `lDrawer` or `rDrawer` props.
     * @internal
     */
    side?: 'left' | 'right';
}

/**
 * A panel-integrated drawer that supports three display modes: overlay (floating),
 * pinned (docked inline), and collapsed (narrow toolbar strip or invisible).
 *
 * Drawers are typically configured as props on a Panel via `lDrawer` or `rDrawer`.
 * The Panel manages layout integration and the Drawer's relationship to the main content area.
 *
 * Overlay mode renders within the parent panel's bounds, not as a full-viewport portal.
 * This ensures the overlay is scoped to the panel that owns it.
 *
 * @see DrawerModel for the state management API.
 */
export const [Drawer, drawer] = hoistCmp.withFactory<DrawerProps>({
    displayName: 'Drawer',
    model: uses(DrawerModel, {
        fromContext: false,
        publishMode: 'limited',
        createDefault: true
    }),
    className: 'xh-drawer',

    render({
        model,
        className,
        title,
        icon,
        collapsedItems,
        side = 'right',
        testId,
        children,
        // Overlay props captured but not used here — Panel renders overlays at panel level.
        isCloseButtonShown: _a,
        canEscapeKeyClose: _b,
        canOutsideClickClose: _c,
        hasBackdrop: _d,
        ...rest
    }) {
        return box({
            className,
            testId,
            items: [
                pinnedContent({model, title, icon, side, children}),
                collapsedContent({model, collapsedItems})
            ],
            style: {display: 'contents'}
        });
    }
});

//-----------------------------------------------
// Inline content (rendered within Drawer's DOM)
//-----------------------------------------------
const pinnedContent = hoistCmp.factory({
    displayName: 'DrawerPinnedContent',
    model: false,
    render({model, title, icon, side, children}: any) {
        if (!model.isPinned) return null;

        return vframe({
            className: classNames('xh-drawer__pinned', `xh-drawer__pinned--${side}`),
            width: model.size,
            flex: 'none',
            items: [
                drawerHeader({title, icon}),
                box({
                    className: 'xh-drawer__content',
                    flex: 'auto',
                    flexDirection: 'column',
                    items: children
                })
            ]
        });
    }
});

const collapsedContent = hoistCmp.factory({
    displayName: 'DrawerCollapsedContent',
    model: false,
    render({model, collapsedItems}: any) {
        if (!model.isCollapsed || !collapsedItems?.length) return null;

        return toolbar({
            vertical: true,
            className: 'xh-drawer__collapsed',
            items: collapsedItems
        });
    }
});

//-----------------------------------------------
// Overlay content (rendered by Panel at panel level)
//-----------------------------------------------
/**
 * Renders the overlay for a drawer, scoped to the parent panel's bounds.
 * Called by Panel — not intended for direct application use.
 * @internal
 */
export const drawerOverlay = hoistCmp.factory({
    displayName: 'DrawerOverlay',
    model: false,
    render({drawerElement, side}: any) {
        if (!drawerElement) return null;

        const props = drawerElement.props,
            model: DrawerModel = props.model,
            {
                title,
                icon,
                isCloseButtonShown = true,
                canEscapeKeyClose = true,
                canOutsideClickClose = true,
                hasBackdrop = true,
                children
            } = props;

        // Hooks must be called unconditionally.
        const onKeyDown = useCallback(
            (e: React.KeyboardEvent) => {
                if (canEscapeKeyClose && e.key === 'Escape') {
                    model.closeOverlay();
                    e.stopPropagation();
                }
            },
            [canEscapeKeyClose, model]
        );

        const focusRef = useCallback((el: HTMLElement) => {
            el?.focus();
        }, []);

        if (!model?.isOverlayOpen) return null;

        return div({
            className: 'xh-drawer__overlay-container',
            onKeyDown,
            tabIndex: -1,
            ref: focusRef,
            items: [
                hasBackdrop
                    ? div({
                          className: 'xh-drawer__overlay-backdrop',
                          onClick: canOutsideClickClose ? () => model.closeOverlay() : undefined
                      })
                    : null,
                vframe({
                    className: classNames('xh-drawer__overlay', `xh-drawer__overlay--${side}`),
                    position: 'absolute',
                    width: model.size,
                    items: [
                        overlayHeader({title, icon, isCloseButtonShown, model}),
                        box({
                            className: 'xh-drawer__content',
                            flex: 'auto',
                            flexDirection: 'column',
                            items: children
                        })
                    ]
                })
            ]
        });
    }
});

const overlayHeader = hoistCmp.factory({
    displayName: 'DrawerOverlayHeader',
    model: false,
    render({title, icon, isCloseButtonShown, model}: any) {
        if (!title && !icon && !isCloseButtonShown) return null;
        return box({
            className: 'xh-drawer__header',
            items: [
                icon,
                title ? box({className: 'xh-drawer__header-title', item: title}) : null,
                isCloseButtonShown
                    ? button({
                          icon: Icon.close(),
                          minimal: true,
                          style: {marginLeft: 'auto'},
                          onClick: () => model.closeOverlay()
                      })
                    : null
            ].filter(Boolean)
        });
    }
});

const drawerHeader = hoistCmp.factory({
    displayName: 'DrawerHeader',
    model: false,
    render({title, icon}: any) {
        if (!title && !icon) return null;
        return box({
            className: 'xh-drawer__header',
            items: [icon, title].filter(Boolean)
        });
    }
});
