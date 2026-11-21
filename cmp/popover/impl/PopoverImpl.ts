/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    arrow,
    autoPlacement,
    autoUpdate,
    type Boundary,
    flip,
    FloatingFocusManager,
    FloatingNode,
    FloatingPortal,
    FloatingTree,
    type Middleware,
    offset,
    type Placement,
    shift,
    size,
    useClick,
    useDismiss,
    useFloating,
    useFloatingNodeId,
    useFloatingParentNodeId,
    useInteractions,
    useMergeRefs
} from '@floating-ui/react';
import {hoistCmp, XH} from '@xh/hoist/core';
import {reaction} from '@xh/hoist/mobx';
import {TEST_ID} from '@xh/hoist/utils/js';
import {elementFromContent, usePortalContainer} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isEmpty, isFunction, isNil, isString} from 'lodash';
import type {
    HTMLAttributes,
    KeyboardEvent,
    MouseEvent,
    ReactElement,
    ReactNode,
    SyntheticEvent
} from 'react';
import {
    Children,
    cloneElement,
    createElement as h,
    Fragment,
    isValidElement,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import type {PopoverBoundary, PopoverPosition, PopoverProps} from '../Types';
import {popoverArrow, POPOVER_ARROW_SIZE} from './PopoverArrow';

/** Gap kept between a popover and the edge of its boundary as it flips or shifts. */
const VIEWPORT_PADDING = 8;

/** Elements whose click closes the popover that holds them, by Hoist's or Blueprint's class. */
const DISMISS_SELECTOR = '.xh-popover-dismiss';

/** Options for Hoist's own components built on the popover, beyond the public `PopoverProps`. */
export interface PopoverImplProps extends PopoverProps {
    /** Point on the page to open at, in place of a target element - e.g. for a context menu. */
    anchorPoint?: {left: number; top: number};

    /** Props for the backdrop, when `hasBackdrop` is set. */
    backdropProps?: HTMLAttributes<HTMLDivElement>;

    /** ARIA role of the popup - e.g. `tooltip`. */
    popupRole?: string;

    /** CSS position of the popover. Default `absolute`. */
    strategy?: 'absolute' | 'fixed';
}

/** Nests each popover in a Floating UI tree, so nested popovers dismiss in the right order. */
export const popoverImpl = hoistCmp.factory<PopoverImplProps>({
    displayName: 'PopoverImpl',
    model: false,
    observer: false,

    render(props) {
        const parentId = useFloatingParentNodeId(),
            impl = popoverInner(props);
        return parentId == null ? h(FloatingTree, null, impl) : impl;
    }
});

const popoverInner = hoistCmp.factory<PopoverImplProps>({
    displayName: 'PopoverInner',
    model: false,
    observer: false,

    render(props) {
        const {
                anchorPoint,
                backdrop = false,
                backdropProps,
                popupRole,
                renderTarget: renderTargetFn,
                autoFocus,
                boundary = 'clippingParents',
                canEscapeKeyClose = true,
                children,
                className,
                defaultIsOpen = false,
                disabled = false,
                hasBackdrop: hasBackdropProp = false,
                hoverCloseDelay = 300,
                hoverOpenDelay = 150,
                interactionKind = 'click',
                isOpen,
                matchTargetWidth = false,
                minimal = false,
                onClose,
                onClosed,
                onClosing,
                onInteraction,
                onOpened,
                onOpening,
                openOnTargetFocus = true,
                popoverClassName,
                popoverRef,
                position = 'auto',
                shouldReturnFocusOnClose = false,
                strategy = 'absolute',
                targetTagName = 'span',
                testId,
                usePortal = true
            } = props,
            hasOffset = !!props.offset,
            offsetMain = props.offset?.mainAxis,
            offsetCross = props.offset?.crossAxis;

        const content = toContentNode(props.content),
            hasBackdrop = hasBackdropProp || backdrop,
            contextContainer = usePortalContainer(),
            // Floating UI treats a null root as one not yet mounted, and renders nothing - so pass
            // undefined, for `document.body`, when no container is set.
            portalContainer = props.portalContainer ?? contextContainer ?? undefined,
            isControlled = isOpen !== undefined,
            isHover = interactionKind === 'hover' || interactionKind === 'hover-target',
            isContentEmpty = isNil(content) || content === '';

        //------------------------
        // Open state
        //------------------------
        const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultIsOpen),
            open = !disabled && !isContentEmpty && (isControlled ? isOpen : uncontrolledOpen),
            timer = useRef<number>(null),
            targetEl = useRef<HTMLElement>(null);

        const clearTimer = () => {
            if (timer.current) window.clearTimeout(timer.current);
            timer.current = null;
        };

        const setOpen = useCallback(
            (next: boolean, e?: SyntheticEvent | Event, delay?: number) => {
                clearTimer();
                if (delay > 0) {
                    timer.current = window.setTimeout(() => setOpen(next, e), delay);
                    return;
                }
                if (isControlled) {
                    onInteraction?.(next, e);
                } else {
                    setUncontrolledOpen(next);
                    onInteraction?.(next, e);
                }
                if (!next) {
                    // Keyboard users closing with Escape get focus back on the target.
                    if ((e as KeyboardEvent)?.key === 'Escape') focusTarget(targetEl.current);
                    onClose?.(e);
                }
            },
            [isControlled, onInteraction, onClose]
        );

        useEffect(() => clearTimer, []);

        // Close on a route change, such as from the browser's back button, so the app does not
        // navigate underneath an open popover.
        useEffect(() => {
            if (!open) return;
            return reaction(
                () => XH.routerState,
                () => setOpen(false)
            );
        }, [open, setOpen]);

        // Close an uncontrolled popover if it becomes disabled.
        useEffect(() => {
            if (disabled && !isControlled && uncontrolledOpen) setUncontrolledOpen(false);
        }, [disabled, isControlled, uncontrolledOpen]);

        //------------------------
        // Positioning
        //------------------------
        const arrowRef = useRef<HTMLDivElement>(null),
            placement = toPlacement(position),
            middleware = useMemo(
                () =>
                    buildMiddleware({
                        placement,
                        boundary,
                        minimal,
                        matchTargetWidth,
                        arrowRef,
                        offsetOpts: hasOffset
                            ? {mainAxis: offsetMain, crossAxis: offsetCross}
                            : null
                    }),
                [placement, boundary, minimal, matchTargetWidth, hasOffset, offsetMain, offsetCross]
            );

        const nodeId = useFloatingNodeId(),
            floating = useFloating({
                nodeId,
                open,
                onOpenChange: (next, e) => setOpen(next, e),
                placement,
                middleware,
                strategy,
                whileElementsMounted: autoUpdate
            }),
            {context, refs, floatingStyles, middlewareData} = floating;

        //------------------------
        // Interactions
        //------------------------
        const click = useClick(context, {enabled: !isHover && !disabled, keyboardHandlers: false}),
            dismiss = useDismiss(context, {
                // `onFloatingKeyDown` handles Escape, so it can stop propagation to any enclosing
                // overlay and close only the innermost popover per keystroke.
                escapeKey: false,
                outsidePress:
                    interactionKind === 'click'
                        ? (e: globalThis.MouseEvent) =>
                              !isInLaterLayer(e.target as Element, refs.floating.current)
                        : false
            }),
            {getReferenceProps, getFloatingProps} = useInteractions([click, dismiss]);

        const onFloatingKeyDown = (e: KeyboardEvent<HTMLElement>) => {
            if (e.key === 'Escape' && canEscapeKeyClose && open) {
                e.stopPropagation();
                setOpen(false, e);
            }
        };

        // A click on a dismiss-classed element within this popover's own content closes it.
        const panelRef = useRef<HTMLDivElement>(null),
            onFloatingClick = (e: MouseEvent) => {
                const target = e.target as Element,
                    dismissEl = target.closest(DISMISS_SELECTOR),
                    isDisabled = target.closest(
                        ':disabled, [aria-disabled=true], .xh-control--disabled, .xh-input-group--disabled, .xh-slider__body--disabled'
                    );
                if (dismissEl && !isDisabled) setOpen(false, e);
            };

        // Hover handling. For `hover`, the pointer can move from target into the popover without it
        // closing. For `hover-target`, only the target counts.
        // A press on a tooltip's target closes it, and keeps it closed until the pointer leaves -
        // so it does not sit beside whatever the press opens, nor reopen as the target takes focus.
        const pressed = useRef(false),
            isTooltip = interactionKind === 'hover-target',
            canHoverOpen = () => !disabled && !pressed.current;
        const hoverHandlers: Record<string, (e: SyntheticEvent) => void> = isHover
            ? {
                  onMouseEnter: e => canHoverOpen() && setOpen(true, e, hoverOpenDelay),
                  onMouseLeave: e => {
                      pressed.current = false;
                      setOpen(false, e, hoverCloseDelay);
                  },
                  ...(isTooltip
                      ? {
                            onPointerDown: e => {
                                pressed.current = true;
                                clearTimer();
                                if (open) setOpen(false, e);
                            }
                        }
                      : {}),
                  ...(openOnTargetFocus
                      ? {
                            onFocus: e => canHoverOpen() && setOpen(true, e, hoverOpenDelay),
                            onBlur: e => setOpen(false, e, hoverCloseDelay)
                        }
                      : {})
              }
            : {};
        const floatingHoverHandlers =
            interactionKind === 'hover'
                ? {onMouseEnter: clearTimer, onMouseLeave: hoverHandlers.onMouseLeave}
                : {};

        //------------------------
        // Lifecycle callbacks
        //------------------------
        const wasOpen = useRef(false);
        useEffect(() => {
            const el = refs.floating.current as HTMLElement;
            if (open && !wasOpen.current) {
                onOpening?.(el);
                onOpened?.(el);
            } else if (!open && wasOpen.current) {
                onClosing?.(el);
                onClosed?.(el);
            }
            wasOpen.current = open;
        }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

        //------------------------
        // Render
        //------------------------
        const mergedPanelRef = useMergeRefs([panelRef, popoverRef]),
            side = floating.placement.split('-')[0];

        // Anchored at a point - position against a zero-size virtual element there.
        useLayoutEffect(() => {
            if (!anchorPoint) return;
            const {left, top} = anchorPoint;
            refs.setPositionReference({
                getBoundingClientRect: () => ({
                    x: left,
                    y: top,
                    left,
                    top,
                    right: left,
                    bottom: top,
                    width: 0,
                    height: 0
                })
            });
        }, [anchorPoint?.left, anchorPoint?.top]); // eslint-disable-line react-hooks/exhaustive-deps

        const target = anchorPoint
            ? null
            : renderTarget({
                  children,
                  className,
                  disabled,
                  interactionKind,
                  isControlled,
                  isHover,
                  open,
                  openOnTargetFocus,
                  renderTargetFn,
                  targetTagName,
                  testId,
                  wrapperProps: {
                      ref: (el: HTMLElement) => {
                          targetEl.current = el;
                          refs.setReference(el);
                      },
                      ...hoverHandlers,
                      ...(isHover ? {} : getReferenceProps({onKeyDown: onTargetKeyDown}))
                  }
              });

        let popup: ReactNode = null;
        if (open) {
            const panel = h(
                'div',
                {
                    ref: refs.setFloating,
                    className: 'xh-popover__floating',
                    style: floatingStyles,
                    ...getFloatingProps({onKeyDown: onFloatingKeyDown, onClick: onFloatingClick}),
                    ...floatingHoverHandlers
                },
                h(
                    'div',
                    {
                        ref: mergedPanelRef,
                        role: popupRole,
                        className: classNames(
                            'xh-popover__content-wrapper',
                            `xh-popover__content-wrapper--${side}`,
                            {
                                'xh-popover__content-wrapper--minimal': minimal,
                                'xh-popover__content-wrapper--match-target-width': matchTargetWidth
                            },
                            popoverClassName
                        )
                    },
                    minimal
                        ? null
                        : popoverArrow(arrowRef, floating.placement, middlewareData.arrow),
                    h('div', {className: 'xh-popover__content'}, content)
                )
            );

            const layer = h(
                'div',
                {className: 'xh-popover__layer'},
                hasBackdrop
                    ? h('div', {
                          ...backdropProps,
                          className: classNames(
                              'xh-popover__content-overlay',
                              {'xh-popover__content-overlay--backdrop': backdrop},
                              backdropProps?.className
                          )
                      })
                    : null,
                h(FloatingFocusManager, {
                    context,
                    modal: false,
                    disabled: isHover || autoFocus === false,
                    initialFocus: refs.floating,
                    returnFocus: shouldReturnFocusOnClose,
                    closeOnFocusOut: false,
                    children: panel
                })
            );

            popup = usePortal ? h(FloatingPortal, {root: portalContainer}, layer) : layer;
        }

        return h(FloatingNode, {id: nodeId}, target, popup);
    }
});

// A component or function given as content renders as an element.
function toContentNode(content: PopoverProps['content']): ReactNode {
    return isFunction(content) || (content as any)?.isHoistComponent
        ? elementFromContent(content as any)
        : (content as ReactNode);
}

//------------------------
// Target
//------------------------
function renderTarget({
    children,
    className,
    disabled,
    interactionKind,
    isControlled,
    isHover,
    open,
    openOnTargetFocus,
    renderTargetFn,
    targetTagName,
    testId,
    wrapperProps
}): ReactElement {
    // Marks a button-like target as pressed while its uncontrolled click popover is open.
    const isActive = open && !isControlled && !isHover,
        ariaProps = {
            // A hover-target popover is a tooltip, which is not a popup the user opens.
            'aria-haspopup': interactionKind === 'hover-target' ? undefined : 'menu',
            ...(isHover ? {} : {'aria-expanded': open})
        },
        // A hover popover that opens on focus needs a target that can take focus.
        tabIndex = isHover && openOnTargetFocus && !disabled ? 0 : undefined;

    if (renderTargetFn) {
        return renderTargetFn({
            ...wrapperProps,
            ...ariaProps,
            tabIndex,
            className: classNames(className, 'xh-popover__target-wrapper', {
                'xh-popover__target-wrapper--open': open,
                'xh-popover__target--active': isActive
            }),
            isOpen: open
        });
    }

    let child = Children.toArray(children)[0];
    if (child == null) return null;
    // A fragment cannot take the target props - target its single child, or wrap its children.
    if (isValidElement(child) && child.type === Fragment) {
        const fragChildren = Children.toArray((child.props as {children?: ReactNode}).children);
        child = fragChildren.length === 1 ? fragChildren[0] : h('span', null, fragChildren);
    }
    if (!isValidElement(child)) child = h('span', null, child);
    const el = child as ReactElement<any>;

    return h(
        targetTagName,
        {
            ...wrapperProps,
            className: classNames(className, 'xh-popover__target-wrapper', {
                'xh-popover__target-wrapper--open': open
            }),
            [TEST_ID]: testId
        },
        // A disabled popover stays closed but leaves its target alone - a validation tooltip on a
        // valid field is disabled, and its input must stay usable.
        cloneElement(el, {
            ...ariaProps,
            tabIndex: el.props.tabIndex ?? tabIndex,
            className: classNames(el.props.className, {
                'xh-popover__target--active': isActive
            })
        })
    );
}

// Keyboard activation for non-button targets. Buttons and links fire their own click.
function onTargetKeyDown(e: KeyboardEvent<HTMLElement>) {
    if ((e.key !== 'Enter' && e.key !== ' ') || e.repeat) return;
    const t = e.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable) return;
    if (e.key === ' ') {
        if (t.closest('button')) return;
        e.preventDefault();
    } else if (t.closest('button, a')) {
        return;
    }
    e.currentTarget.click();
}

function focusTarget(el: HTMLElement) {
    const focusable = el?.matches('button, a[href], input, [tabindex]')
        ? el
        : el?.querySelector<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])');
    // Deferred until the popover has unmounted, so its focus manager does not reclaim focus.
    if (focusable) window.setTimeout(() => focusable.focus(), 0);
}

//------------------------
// Positioning
//------------------------
/** Map a Hoist position to a Floating UI placement - undefined for the `auto` positions. */
export function toPlacement(position: PopoverPosition): Placement {
    if (isEmpty(position) || position.startsWith('auto')) return undefined;
    const [side, align] = position.split('-');
    if (!align) return side as Placement;
    const isStart = align === 'left' || align === 'top';
    return `${side}-${isStart ? 'start' : 'end'}` as Placement;
}

function buildMiddleware({
    placement,
    boundary,
    minimal,
    matchTargetWidth,
    arrowRef,
    offsetOpts
}): Middleware[] {
    const bounds = {boundary: toBoundary(boundary), padding: VIEWPORT_PADDING},
        ret: Middleware[] = [];
    if (offsetOpts) {
        ret.push(offset(offsetOpts));
    } else if (!minimal) {
        ret.push(offset({mainAxis: POPOVER_ARROW_SIZE / 2}));
    }
    ret.push(placement ? flip(bounds) : autoPlacement(bounds));
    ret.push(shift(bounds));
    if (matchTargetWidth) {
        ret.push(
            size({
                apply({rects, elements}) {
                    elements.floating.style.width = `${rects.reference.width}px`;
                }
            })
        );
    }
    if (!minimal) ret.push(arrow({element: arrowRef}));
    return ret;
}

function toBoundary(boundary: PopoverBoundary): Boundary {
    return isString(boundary) ? 'clippingAncestors' : boundary;
}

//------------------------
// Overlay stacking
//------------------------
/**
 * True if `target` is in a top-level layer of the document mounted after the popover's own - an
 * overlay opened from within it, such as a nested popover, a select dropdown, an AG Grid popup or
 * a dialog. A press there must not dismiss the popover. This works across overlay
 * libraries, since each mounts its layer as a later child of the document body. Floating UI makes
 * the same check only while its focus manager is active, so this covers `autoFocus: false` too.
 */
function isInLaterLayer(target: Element, floatingEl: Element): boolean {
    if (!target || !floatingEl) return false;
    const mine = topLayerOf(floatingEl),
        theirs = topLayerOf(target);
    return (
        mine !== theirs &&
        !!(mine.compareDocumentPosition(theirs) & Node.DOCUMENT_POSITION_FOLLOWING)
    );
}

function topLayerOf(el: Element): Element {
    const body = el.ownerDocument.body;
    let ret = el;
    while (ret.parentElement && ret.parentElement !== body) ret = ret.parentElement;
    return ret;
}
