/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

/**
 * @internal
 */
export function isDraggingChild(e: TouchEvent, direction: 'up' | 'right' | 'down' | 'left') {
    // Loop through the touch targets to ensure it is safe to swip
    for (let el = e.target as HTMLElement; el && el !== document.body; el = el.parentElement) {
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
    return false;
}

export function isScrollable(e: TouchEvent, axis: 'horizontal' | 'vertical') {
    // Loop through the touch targets to ensure it is safe to drag
    for (let el = e.target as HTMLElement; el && el !== document.body; el = el.parentElement) {
        if (isScrollableEl(el, axis)) {
            return true;
        }
    }
    return false;
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
