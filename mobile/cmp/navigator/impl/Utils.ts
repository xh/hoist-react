/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

/**
 * @internal
 */

//---------------------------
// "Scrollable" in this context means styled to allow scrolling in the given axis, and it's
// internal size is larger than the container.
//---------------------------
export function hasScrollableParent(e: TouchEvent, axis: 'horizontal' | 'vertical'): boolean {
    return !!findScrollableParent(e, axis);
}

export function findScrollableParent(e: TouchEvent, axis: 'horizontal' | 'vertical'): HTMLElement {
    for (let el = e.target as HTMLElement; el && el !== document.body; el = el.parentElement) {
        if (isScrollableEl(el, axis)) {
            return el;
        }
    }
    return null;
}

export function isScrollableEl(el: HTMLElement, axis: 'horizontal' | 'vertical') {
    // Don't conflict with grid header reordering or chart dragging.
    if (el.classList.contains('xh-grid-header') || el.classList.contains('xh-chart')) {
        return true;
    }

    // Ignore Onsen "swiper" elements created by tab container (even without swiping enabled)
    if (el.classList.contains('ons-swiper') || el.classList.contains('ons-swiper-target')) {
        return false;
    }

    const {overflowX, overflowY} = window.getComputedStyle(el);
    if (
        axis === 'horizontal' &&
        el.scrollWidth > el.offsetWidth &&
        (overflowX === 'auto' || overflowX === 'scroll')
    ) {
        return true;
    }
    if (
        axis === 'vertical' &&
        el.scrollHeight > el.offsetHeight &&
        (overflowY === 'auto' || overflowY === 'scroll')
    ) {
        return true;
    }
    return false;
}

//---------------------------
// "Draggable" in this context means both "Scrollable" and has room to scroll in the given direction,
// i.e. it would consume a drag gesture. Open to suggestions for a better name.
//---------------------------
export function hasDraggableParent(
    e: TouchEvent,
    direction: 'up' | 'right' | 'down' | 'left'
): boolean {
    return !!findDraggableParent(e, direction);
}

export function findDraggableParent(
    e: TouchEvent,
    direction: 'up' | 'right' | 'down' | 'left'
): HTMLElement {
    // Loop through the touch targets to ensure it is safe to swipe
    for (let el = e.target as HTMLElement; el && el !== document.body; el = el.parentElement) {
        if (isDraggableEl(el, direction)) {
            return el;
        }
    }
    return null;
}

export function isDraggableEl(
    el: HTMLElement,
    direction: 'up' | 'right' | 'down' | 'left'
): boolean {
    // Don't conflict with grid header reordering or chart dragging.
    if (el.classList.contains('xh-grid-header') || el.classList.contains('xh-chart')) {
        return true;
    }

    const axis = direction === 'left' || direction === 'right' ? 'horizontal' : 'vertical';
    if (isScrollableEl(el, axis)) {
        // Ensure any scrolling element in the target path takes priority over swipe navigation.
        if (direction === 'left' && el.scrollLeft < el.scrollWidth - el.offsetWidth) {
            return true;
        }
        if (direction === 'right' && el.scrollLeft > 0) {
            return true;
        }
        if (direction === 'up' && el.scrollTop < el.scrollHeight - el.offsetHeight) {
            return true;
        }
        if (direction === 'down' && el.scrollTop > 0) {
            return true;
        }
    }
}
