/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * Scroll a switcher's tab strip by the smallest distance that shows all of `tab`. Unlike
 * `Element.scrollIntoView()`, this never scrolls a container around the strip, such as a
 * scrolling panel the switcher sits in.
 * @internal
 */
export function scrollTabIntoView(
    tab: HTMLElement,
    strip: HTMLElement,
    vertical: boolean,
    behavior: ScrollBehavior = 'auto'
) {
    const tabRect = tab.getBoundingClientRect(),
        stripRect = strip.getBoundingClientRect(),
        // Negative when the tab starts before the strip's visible area.
        startOffset = vertical ? tabRect.top - stripRect.top : tabRect.left - stripRect.left,
        // Positive when the tab ends after the strip's visible area.
        endOffset = vertical ? tabRect.bottom - stripRect.bottom : tabRect.right - stripRect.right,
        delta =
            startOffset < 0 ? startOffset : endOffset > 0 ? Math.min(startOffset, endOffset) : 0;

    if (delta) strip.scrollBy({[vertical ? 'top' : 'left']: delta, behavior});
}
