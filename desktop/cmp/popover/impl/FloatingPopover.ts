/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * SPIKE - Blueprint removal, Phase 0. A popover built directly on Floating UI, standing in for
 * Blueprint's `PopoverNext` + `Overlay2` behind the `popover` factory in `kit/blueprint`.
 *
 * Takes `PopoverNextProps` (the output of Blueprint's `popoverPropsToNextProps`) so it can drop in
 * for existing call sites unchanged. Emits Blueprint's popover class names so current Hoist and app
 * styles still apply while the two implementations are compared.
 */
import type {MiddlewareConfig, PopoverNextProps} from '@blueprintjs/core';
import {
    arrow as arrowMw,
    autoPlacement,
    autoUpdate,
    flip,
    FloatingFocusManager,
    FloatingNode,
    FloatingPortal,
    FloatingTree,
    hide,
    inline,
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
import classNames from 'classnames';
import {isFunction, isNil} from 'lodash';
import type {FC, KeyboardEvent, MouseEvent, ReactElement, ReactNode, SyntheticEvent} from 'react';
import {
    Children,
    cloneElement,
    createElement as h,
    isValidElement,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';

const ARROW_SIZE = 30,
    ARROW_SPACING = 4,
    ARROW_SHADOW_PATH =
        'M8.11 6.302c1.015-.936 1.887-2.922 1.887-4.297v26c0-1.378-.868-3.357-1.888-4.297L.925 17.09c-1.237-1.14-1.233-3.034 0-4.17L8.11 6.302z',
    ARROW_FILL_PATH =
        'M8.787 7.036c1.22-1.125 2.21-3.376 2.21-5.03V0v30-2.005c0-1.654-.983-3.9-2.21-5.03l-7.183-6.616c-.81-.746-.802-1.96 0-2.7l7.183-6.614z';

const DISMISS_SELECTOR = '.bp6-popover-dismiss, .xh-popover-dismiss',
    DISMISS_OVERRIDE_SELECTOR = '.bp6-popover-dismiss-override, .xh-popover-dismiss-override';

/** Nests each popover in a Floating UI tree, so dismissal is aware of parent/child popovers. */
export const FloatingPopover: FC<PopoverNextProps> = props => {
    const parentId = useFloatingParentNodeId(),
        impl = h(PopoverImpl, props);
    return parentId == null ? h(FloatingTree, null, impl) : impl;
};

const PopoverImpl: FC<PopoverNextProps> = props => {
    const {
        arrow = true,
        autoFocus,
        boundary = 'clippingAncestors',
        canEscapeKeyClose = true,
        captureDismiss = false,
        children,
        className,
        content,
        defaultIsOpen = false,
        disabled = false,
        enforceFocus = true,
        fill = false,
        hasBackdrop = false,
        hoverCloseDelay = 300,
        hoverOpenDelay = 150,
        interactionKind = 'click',
        isOpen,
        matchTargetWidth = false,
        middleware: middlewareOverrides,
        onClose,
        onClosed,
        onClosing,
        onInteraction,
        onOpened,
        onOpening,
        openOnTargetFocus = true,
        placement,
        popoverClassName,
        popoverRef,
        portalContainer,
        positioningStrategy = 'absolute',
        renderTarget,
        rootBoundary,
        shouldReturnFocusOnClose = false,
        targetProps,
        targetTagName = 'span',
        usePortal = true
    } = props;

    const isControlled = isOpen !== undefined,
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
        (next: boolean, event?: SyntheticEvent | Event, delay?: number) => {
            clearTimer();
            if (delay > 0) {
                timer.current = window.setTimeout(() => setOpen(next, event), delay);
                return;
            }
            if (isControlled) {
                onInteraction?.(next, event as any);
            } else {
                setUncontrolledOpen(next);
            }
            if (!next) {
                // Keyboard users closing with Escape get focus back on the target.
                if ((event as KeyboardEvent)?.key === 'Escape') focusTarget(targetEl.current);
                onClose?.(event as any);
            }
        },
        [isControlled, onInteraction, onClose]
    );

    useEffect(() => clearTimer, []);

    // Close an uncontrolled popover if it becomes disabled.
    useEffect(() => {
        if (disabled && !isControlled && uncontrolledOpen) setUncontrolledOpen(false);
    }, [disabled, isControlled, uncontrolledOpen]);

    //------------------------
    // Positioning
    //------------------------
    const arrowRef = useRef<HTMLDivElement>(null),
        middleware = useMemo(
            () =>
                buildMiddleware({
                    ...(placement === undefined
                        ? {autoPlacement: {boundary, rootBoundary}}
                        : {flip: {boundary, rootBoundary}}),
                    ...(arrow
                        ? {arrow: {element: arrowRef}, offset: {mainAxis: ARROW_SIZE / 2}}
                        : {}),
                    shift: {boundary, rootBoundary},
                    size: matchTargetWidth
                        ? {
                              apply({rects, elements}) {
                                  elements.floating.style.width = `${rects.reference.width}px`;
                              }
                          }
                        : undefined,
                    ...middlewareOverrides
                }),
            [placement, boundary, rootBoundary, arrow, matchTargetWidth, middlewareOverrides]
        );

    const nodeId = useFloatingNodeId(),
        floating = useFloating({
            nodeId,
            open,
            onOpenChange: (next, event) => setOpen(next, event),
            placement: placement as Placement,
            middleware,
            strategy: positioningStrategy,
            whileElementsMounted: autoUpdate
        }),
        {context, refs, floatingStyles, middlewareData} = floating;

    //------------------------
    // Interactions
    //------------------------
    const click = useClick(context, {enabled: !isHover && !disabled, keyboardHandlers: false}),
        dismiss = useDismiss(context, {
            // Escape is handled in `onFloatingKeyDown` so it can stop propagation to any enclosing
            // overlay, closing only the innermost popover per keystroke.
            escapeKey: false,
            outsidePress:
                interactionKind === 'click'
                    ? (e: globalThis.MouseEvent) =>
                          !isInLaterLayer(e.target as Element, refs.floating.current)
                    : false
        }),
        {getReferenceProps, getFloatingProps} = useInteractions([click, dismiss]);

    const onFloatingKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && canEscapeKeyClose && open) {
            e.stopPropagation();
            setOpen(false, e);
        }
    };

    // Clicks on dismiss-classed elements (e.g. menu items) close the popover - the protocol
    // Blueprint's `MenuItem.shouldDismissPopover` relies on.
    const popoverEl = useRef<HTMLDivElement>(null),
        onFloatingClick = (e: MouseEvent) => {
            const target = e.target as Element,
                eventPopover = target.closest('.xh-floating-popover'),
                isFromSelf = eventPopover === popoverEl.current,
                dismissEl = target.closest(`${DISMISS_SELECTOR}, ${DISMISS_OVERRIDE_SELECTOR}`),
                shouldDismiss = dismissEl?.matches(DISMISS_SELECTOR) ?? false,
                isDisabled = target.closest(':disabled, .bp6-disabled') != null;
            if (shouldDismiss && !isDisabled && (!captureDismiss || isFromSelf)) {
                setOpen(false, e);
            }
        };

    // Hover handling, with Blueprint's open/close delays. For `hover`, the pointer can move from
    // target into the popover without closing it. For `hover-target`, only the target counts.
    const hoverHandlers: Record<string, (e: SyntheticEvent) => void> = isHover
        ? {
              onMouseEnter: e => !disabled && setOpen(true, e, hoverOpenDelay),
              onMouseLeave: e => setOpen(false, e, hoverCloseDelay),
              ...(openOnTargetFocus
                  ? {
                        onFocus: e => !disabled && setOpen(true, e, hoverOpenDelay),
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
    const mergedPopoverRef = useMergeRefs([popoverEl, popoverRef as any]),
        floatingRef = useMergeRefs([refs.setFloating]),
        basePlacement = floating.placement.split('-')[0];

    const target = renderTargetElement({
        children,
        className,
        disabled,
        fill,
        isControlled,
        isHover,
        open,
        renderTarget,
        targetProps,
        targetTagName,
        referenceProps: {
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
        const popover = h(
            'div',
            {
                ref: floatingRef,
                className: 'bp6-popover-transition-container xh-floating-popover__container',
                style: floatingStyles,
                ...getFloatingProps({onKeyDown: onFloatingKeyDown, onClick: onFloatingClick}),
                ...floatingHoverHandlers
            },
            h(
                'div',
                {
                    ref: mergedPopoverRef,
                    className: classNames(
                        'bp6-popover',
                        'xh-floating-popover',
                        `bp6-popover-placement-${basePlacement}`,
                        {
                            'bp6-popover-capturing-dismiss': captureDismiss,
                            'bp6-popover-match-target-width': matchTargetWidth
                        },
                        popoverClassName
                    )
                },
                arrow ? popoverArrow(arrowRef, floating.placement, middlewareData.arrow) : null,
                h('div', {className: 'bp6-popover-content'}, content)
            )
        );

        const focusManaged = h(FloatingFocusManager, {
            context,
            modal: false,
            disabled: isHover || autoFocus === false,
            initialFocus: refs.floating,
            returnFocus: shouldReturnFocusOnClose,
            closeOnFocusOut: false,
            children: popover
        });

        const layer = h(
            'div',
            {className: 'xh-floating-popover__layer'},
            hasBackdrop ? h('div', {className: 'bp6-overlay-backdrop bp6-popover-backdrop'}) : null,
            focusManaged
        );

        popup = usePortal ? h(FloatingPortal, {root: portalContainer}, layer) : layer;
    }

    // Not yet implemented for the spike: transitions (Hoist disables them anyway), `lazy`,
    // `inheritDarkTheme` (Hoist themes via a body class), and `enforceFocus` - Blueprint pulls focus
    // back into an open popover, which this does not.
    void enforceFocus;

    return h(FloatingNode, {id: nodeId}, target, popup);
};

//------------------------
// Target
//------------------------
function renderTargetElement({
    children,
    className,
    disabled,
    fill,
    isControlled,
    isHover,
    open,
    renderTarget,
    targetProps,
    targetTagName,
    referenceProps
}): ReactElement {
    const modifierClasses = {
        'bp6-active': open && !isControlled && !isHover,
        'bp6-fill': fill
    };
    const wrapperProps = {
        ...referenceProps,
        className: classNames(
            className,
            'bp6-popover-target',
            {'bp6-popover-open': open},
            {
                'bp6-fill': fill
            }
        )
    };
    const ariaProps = {'aria-expanded': isHover ? undefined : open, 'aria-haspopup': 'menu'};

    if (isFunction(renderTarget)) {
        return renderTarget({
            ...wrapperProps,
            ...ariaProps,
            className: classNames(wrapperProps.className, modifierClasses),
            isOpen: open
        });
    }

    let child = Children.toArray(children)[0];
    if (child == null) return null;
    if (!isValidElement(child)) child = h('span', null, child);
    const el = child as ReactElement<any>;

    return h(
        fill ? 'div' : targetTagName,
        {...wrapperProps, ...targetProps},
        cloneElement(el, {
            ...ariaProps,
            className: classNames(el.props.className, modifierClasses),
            disabled: el.props.disabled ?? (disabled || undefined)
        })
    );
}

function focusTarget(el: HTMLElement) {
    const focusable = el?.matches(':is(button, a, input, [tabindex])')
        ? el
        : el?.querySelector<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])');
    // Defer until the popover has unmounted, so its focus manager does not reclaim focus.
    if (focusable) window.setTimeout(() => focusable.focus(), 0);
}

// Keyboard activation for non-button targets, mirroring Blueprint's `PopoverTarget`.
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

//------------------------
// Arrow
//------------------------
function popoverArrow(ref, placement: Placement, data: {x?: number; y?: number}) {
    const base = placement.split('-')[0],
        angle = {top: -90, left: 180, bottom: 90}[base] ?? 0,
        refOffset = ARROW_SIZE / 2 - ARROW_SPACING,
        sideStyle = {
            top: {bottom: -refOffset},
            left: {right: -refOffset},
            bottom: {top: -refOffset}
        }[base] ?? {left: -refOffset};

    return h(
        'div',
        {
            ref,
            'aria-hidden': true,
            className: 'bp6-popover-arrow',
            style: {position: 'absolute', left: data?.x, top: data?.y, ...sideStyle}
        },
        h(
            'svg',
            {viewBox: `0 0 ${ARROW_SIZE} ${ARROW_SIZE}`, style: {transform: `rotate(${angle}deg)`}},
            h('path', {className: 'bp6-popover-arrow-border', d: ARROW_SHADOW_PATH}),
            h('path', {className: 'bp6-popover-arrow-fill', d: ARROW_FILL_PATH})
        )
    );
}

//------------------------
// Middleware
//------------------------
function buildMiddleware(cfg: MiddlewareConfig): Middleware[] {
    const ret: Middleware[] = [];
    if (cfg.offset) ret.push(offset(cfg.offset));
    if (cfg.inline) ret.push(inline(cfg.inline));
    ret.push(cfg.flip && !cfg.autoPlacement ? flip(cfg.flip) : autoPlacement(cfg.autoPlacement));
    if (cfg.shift) ret.push(shift(cfg.shift));
    if (cfg.size) ret.push(size(cfg.size));
    if (cfg.arrow?.element)
        ret.push(arrowMw({element: cfg.arrow.element, padding: cfg.arrow.padding}));
    if (cfg.hide) ret.push(hide(cfg.hide));
    return ret;
}

//------------------------
// Overlay stacking
//------------------------
/**
 * True if `target` sits in a body-level layer mounted after the popover's own - a child overlay
 * opened from within it (a nested popover, a select dropdown, a Blueprint submenu, an AG Grid popup).
 * Presses there must not dismiss the popover. This works across overlay systems, since each mounts
 * its own layer as a later child of `document.body`.
 */
function isInLaterLayer(target: Element, floatingEl: Element): boolean {
    if (!target || !floatingEl) return false;
    const mine = bodyLevelAncestor(floatingEl),
        theirs = bodyLevelAncestor(target);
    return (
        mine !== theirs &&
        !!(mine.compareDocumentPosition(theirs) & Node.DOCUMENT_POSITION_FOLLOWING)
    );
}

function bodyLevelAncestor(el: Element): Element {
    let ret = el;
    while (ret.parentElement && ret.parentElement !== document.body) ret = ret.parentElement;
    return ret;
}
