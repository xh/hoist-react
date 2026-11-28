/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {Content, HoistProps, TestSupportProps} from '@xh/hoist/core';
import type {HTMLAttributes, ReactElement, ReactNode, Ref, SyntheticEvent} from 'react';

/**
 * Where a popover, menu or tooltip appears relative to its target. The first word is the side of
 * the target, the second the edge it aligns to - e.g. `bottom-left` opens below the target, aligned
 * to its left edge. The `auto` values pick the side with the most room.
 */
export type PopoverPosition =
    | 'auto'
    | 'auto-start'
    | 'auto-end'
    | 'top'
    | 'top-left'
    | 'top-right'
    | 'bottom'
    | 'bottom-left'
    | 'bottom-right'
    | 'left'
    | 'left-top'
    | 'left-bottom'
    | 'right'
    | 'right-top'
    | 'right-bottom';

/**
 * Area a popover stays within when it flips or shifts to fit - `clippingParents` (the default)
 * for the target's nearest clipping ancestors, or specific elements.
 */
export type PopoverBoundary = 'clippingParents' | Element | Element[];

/**
 * How a popover opens and closes.
 *  - `click` (default) - click the target to toggle; click outside or press Escape to close.
 *  - `click-target` - as `click`, but a click outside does not close it.
 *  - `hover` - opens while the pointer is over the target or the popover.
 *  - `hover-target` - opens while the pointer is over the target only.
 */
export type PopoverInteractionKind = 'click' | 'click-target' | 'hover' | 'hover-target';

export interface PopoverProps extends HoistProps, TestSupportProps {
    /**
     * Content of the popover - an element, or a component or function that renders one. Nothing
     * opens while it is null or empty.
     */
    content?: ReactNode | Content;

    /** Target element the popover opens from - pass exactly one. */
    children?: ReactNode;

    /** True to show the popover. Passing this prop makes the popover controlled. */
    isOpen?: boolean;

    /** True to show an uncontrolled popover when first rendered. */
    defaultIsOpen?: boolean;

    /** Called when user interaction would open or close the popover. */
    onInteraction?: (nextOpenState: boolean, e?: SyntheticEvent | Event) => void;

    /** True to keep the popover closed and ignore interaction with the target. */
    disabled?: boolean;

    /** How the popover opens and closes. Default 'click'. */
    interactionKind?: PopoverInteractionKind;

    /** Milliseconds before a hover popover opens. Default 150. */
    hoverOpenDelay?: number;

    /** Milliseconds before a hover popover closes. Default 300. */
    hoverCloseDelay?: number;

    /** False to keep a hover popover closed when its target takes keyboard focus. Default true. */
    openOnTargetFocus?: boolean;

    /** Position relative to the target. Default 'auto'. */
    position?: PopoverPosition;

    /** Area the popover stays within as it flips or shifts to fit. Default 'clippingParents'. */
    boundary?: PopoverBoundary;

    /** True to draw without an arrow pointing at the target. */
    minimal?: boolean;

    /**
     * Distance in pixels from the target. `mainAxis` moves the popover away from the target, and
     * `crossAxis` slides it along the target's edge. Default 0 for a minimal popover, else room
     * for the arrow.
     */
    offset?: {mainAxis?: number; crossAxis?: number};

    /** True to size the popover to the width of its target. */
    matchTargetWidth?: boolean;

    /**
     * True to cover the page with a transparent backdrop while open, blocking clicks behind it.
     * Default true on mobile, so a tap outside the popover closes it without reaching what lies
     * behind.
     */
    hasBackdrop?: boolean;

    /** True to dim the page behind the open popover. Implies `hasBackdrop`. */
    backdrop?: boolean;

    /** CSS class name for the popover element. */
    popoverClassName?: string;

    /** Ref to the popover element. */
    popoverRef?: Ref<HTMLElement>;

    /** Tag of the element wrapping the target. Default 'span'. */
    targetTagName?: 'span' | 'div';

    /**
     * Render the target directly, in place of `children` and the element that wraps them. Spread
     * the props it receives, including `ref`, onto the target element.
     */
    renderTarget?: (props: PopoverTargetProps) => ReactElement;

    /** False to render the popover inline, next to its target, rather than in a portal. */
    usePortal?: boolean;

    /**
     * Element to render the popover in. Default `document.body`.
     */
    portalContainer?: HTMLElement;

    /** False to leave focus where it is when the popover opens. Default true for click popovers. */
    autoFocus?: boolean;

    /** False to leave a popover open when Escape is pressed within it. Default true. */
    canEscapeKeyClose?: boolean;

    /** True to return focus to the target when the popover closes. Escape always returns it. */
    shouldReturnFocusOnClose?: boolean;

    /** Called when user interaction closes the popover. */
    onClose?: (e?: SyntheticEvent | Event) => void;

    /** Called with the popover element as it opens. */
    onOpening?: (node: HTMLElement) => void;

    /** Called with the popover element once it has opened. */
    onOpened?: (node: HTMLElement) => void;

    /** Called with the popover element as it closes. */
    onClosing?: (node: HTMLElement) => void;

    /** Called with the popover element once it has closed. */
    onClosed?: (node: HTMLElement) => void;
}

/** Props for a target rendered by `PopoverProps.renderTarget`. */
export type PopoverTargetProps = HTMLAttributes<HTMLElement> & {
    ref: Ref<HTMLElement>;
    isOpen: boolean;
};
