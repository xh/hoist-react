/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistModel, RefreshMode, RenderMode, XH} from '@xh/hoist/core';
import {action, bindable, makeObservable} from '@xh/hoist/mobx';
import {ensureNotEmpty, ensureUniqueBy, throwIf, mergeDeep} from '@xh/hoist/utils/js';
import {wait} from '@xh/hoist/promise';
import {find, isEqual, keys} from 'lodash';
import {Swiper} from 'swiper/types';
import '@xh/hoist/mobile/register';
import {PageConfig, PageModel} from './PageModel';
import {findScrollableParent, isDraggableEl} from './impl/Utils';

export interface NavigatorConfig {
    /** Configs for PageModels, representing all supported pages within this Navigator/App. */
    pages: PageConfig[];

    /**
     * True to enable activity tracking of page views (default false).
     * Viewing of each page will be tracked with the `oncePerSession` flag, to avoid duplication.
     */
    track?: boolean;

    /** True to enable 'pull down to refresh' functionality. */
    pullDownToRefresh?: boolean;

    /**
     * Time (in milliseconds) for the transition between pages on route change.
     * Defaults to 500.
     */
    transitionMs?: number;

    /**
     * Strategy for rendering pages. Can be set per-page via `PageModel.renderMode`.
     * See enum for description of supported modes.
     */
    renderMode?: RenderMode;

    /**
     * Strategy for refreshing pages. Can be set per-page via `PageModel.refreshMode`.
     * See enum for description of supported modes.
     */
    refreshMode?: RefreshMode;
}

/**
 * Model for handling stack-based navigation between pages.
 * Provides support for routing based navigation.
 */
export class NavigatorModel extends HoistModel {
    @bindable disableAppRefreshButton: boolean;

    @bindable.ref
    stack: PageModel[] = [];

    pages: PageConfig[] = [];
    track: boolean;
    pullDownToRefresh: boolean;
    transitionMs: number;
    renderMode: RenderMode;
    refreshMode: RefreshMode;

    private _swiper: Swiper;
    private _callback: () => void;
    private _touchStartX: number;

    get activePageId(): string {
        return this.activePage?.id;
    }

    get activePage(): PageModel {
        return this.stack[this.activePageIdx];
    }

    get activePageIdx(): number {
        return this._swiper?.activeIndex ?? 0;
    }

    get allowSlideNext(): boolean {
        return this.activePageIdx < this.stack.length - 1;
    }

    get allowSlidePrev(): boolean {
        return this.activePageIdx > 0;
    }

    constructor({
        pages,
        track = false,
        pullDownToRefresh = true,
        transitionMs = 500,
        renderMode = 'lazy',
        refreshMode = 'onShowLazy'
    }: NavigatorConfig) {
        super();
        makeObservable(this);
        throwIf(
            renderMode === 'always',
            "RenderMode 'always' is not supported in Navigator. Pages can't exist before being mounted."
        );

        ensureNotEmpty(pages, 'NavigatorModel needs at least one page.');
        ensureUniqueBy(pages, 'id', 'Multiple NavigatorModel PageModels have the same id.');

        this.pages = pages;
        this.track = track;
        this.pullDownToRefresh = pullDownToRefresh;
        this.transitionMs = transitionMs;
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;

        this.addReaction({
            track: () => XH.routerState,
            run: () => this.onRouteChange()
        });

        if (track) {
            this.addReaction({
                track: () => this.activePageId,
                run: activePageId => {
                    XH.track({
                        category: 'Navigation',
                        message: `Viewed ${activePageId} page`,
                        oncePerSession: true
                    });
                }
            });
        }
    }

    /**
     * @param callback - function to execute (once) after the next page transition.
     */
    setCallback(callback: () => void) {
        this._callback = callback;
    }

    //--------------------
    // Implementation
    //--------------------
    /** @internal */
    setSwiper(swiper: Swiper) {
        if (this._swiper) return;
        this._swiper = swiper;

        swiper.on('transitionEnd', () => this.onPageChange());

        // Ensure Swiper's touch move is initially disabled, and capture
        // the initial touch position. This is required to allow touch move
        // to propagate to scrollable elements within the page.
        swiper.on('touchStart', (s, event: PointerEvent) => {
            swiper.allowTouchMove = false;
            this._touchStartX = event.pageX;
        });

        // Add our own "touchmove" handler to the swiper, allowing us to toggle
        // the built-in touch detection based on the presence of scrollable elements.
        swiper.el.addEventListener('touchmove', (event: TouchEvent) => {
            const touch = event.touches[0],
                distance = touch.clientX - this._touchStartX,
                direction = distance > 0 ? 'right' : 'left';

            const scrollableParent = findScrollableParent(event, 'horizontal');
            if (scrollableParent) {
                // If there is a scrollable parent we need to determine whether to allow
                // the swiper or the scrollable parent to "win".

                if (direction === 'left') {
                    // If we are scrolling "left" (i.e. "forward"), simply always prevent Swiper
                    // to allow internal scrolling. Our stack-based navigation does not allow
                    // forward navigation.
                    swiper.allowTouchMove = false;
                } else {
                    // If we are scrolling "right" (i.e. "back"), we favor Swiper if the scrollable
                    // parent is at the leftmost start of its scroll, or if we are in the middle of
                    // a Swiper transition.
                    swiper.allowTouchMove =
                        swiper.progress < 1 || !isDraggableEl(scrollableParent, 'right');

                    // During the swiper transition, undo the scrollable parent's internal scroll
                    // to keep it static.
                    if (swiper.progress < 1) {
                        scrollableParent.scrollLeft -= distance;
                    }
                }
            } else {
                // If there is no scrollable parent, simply allow the swipe to proceed.
                swiper.allowTouchMove = true;
            }
        });

        // Ensure Swiper's touch move is disabled after each touch completes.
        swiper.on('touchEnd', () => {
            swiper.allowTouchMove = false;
        });

        this.onRouteChange(true);
    }

    /** @internal */
    @action
    onPageChange = () => {
        // 1) Clear any pages after the active page. These can be left over from a back swipe.
        this.stack = this.stack.slice(0, this._swiper.activeIndex + 1);

        // 2) Sync route to match the current page stack
        const newRouteName = this.stack.map(it => it.id).join('.'),
            newRouteParams = mergeDeep({}, ...this.stack.map(it => it.props));

        XH.navigate(newRouteName, newRouteParams);

        // 3) Update state according to the active page and trigger optional callback
        this.disableAppRefreshButton = this.activePage?.disableAppRefreshButton;
        this._callback?.();
        this._callback = null;

        // 4) Remove finished shadow components. These are created during transitions,
        // and remain overlaid on the page, preventing touch events from reaching the page.
        // Presumably a bug in the Swiper library.
        document.querySelectorAll('.swiper-slide-shadow-creative').forEach(e => e.remove());
    };

    private onRouteChange(init: boolean = false) {
        if (!this._swiper || !XH.routerState) return;

        // Break the current route name into parts, and collect any params for each part.
        // Use meta.params to determine which params are associated with each route part.
        // Save these params to use as props for the page.
        const {meta, name, params} = XH.routerState,
            parts = name.split('.');

        const routeParts = parts.map((id, idx) => {
            const metaKey = parts.slice(0, idx + 1).join('.'),
                props = {};

            // Extract props for this part
            keys(meta.params[metaKey]).forEach(it => {
                props[it] = params[it];
            });

            return {id, props};
        });

        // Loop through the route parts, rebuilding the page stack to match.
        const stack = [];
        for (let i = 0; i < routeParts.length; i++) {
            const part = routeParts[i],
                pageModelCfg = find(this.pages, {id: part.id});

            // Ensure PageModel that matches route exists
            throwIf(
                !pageModelCfg,
                `Route ${part.id} does not match any PageModel.id configured in the NavigatorModel`
            );

            // If, on the initial pass, we encounter a route that prevents direct linking,
            // we drop the rest of the route and redirect to the route so far
            if (init && pageModelCfg.disableDirectLink) {
                const completedRouteParts = routeParts.slice(0, i),
                    newRouteName = completedRouteParts.map(it => it.id).join('.'),
                    newRouteParams = mergeDeep({}, ...completedRouteParts.map(it => it.props));

                XH.navigate(newRouteName, newRouteParams, {replace: true});
                return;
            }

            // Re-use existing PageModels where possible
            const existingPageModel = i < this.stack.length ? this.stack[i] : null;
            if (
                existingPageModel?.id === part.id &&
                isEqual(existingPageModel?.props, part.props)
            ) {
                stack.push(existingPageModel);
            } else {
                stack.push(
                    new PageModel({
                        navigatorModel: this,
                        ...mergeDeep({}, pageModelCfg, part)
                    })
                );
            }
        }

        // Immediately set the stack if this is the initial route change
        if (init) {
            this.stack = stack;
            this._swiper.update();
            this._swiper.activeIndex = this.stack.length - 1;
            return;
        }

        // Compare new stack to current stack to determine how to navigate
        const {transitionMs} = this,
            newKeyStack = stack.map(it => it.key),
            currKeyStack = this.stack.map(it => it.key),
            backOnePage = isEqual(newKeyStack, currKeyStack.slice(0, -1)),
            forwardOnePage = isEqual(newKeyStack.slice(0, -1), currKeyStack);

        if (backOnePage) {
            // Don't update the stack yet. Instead, wait until after the animation has
            // completed in onPageChange().
            this._swiper.slidePrev(transitionMs);
        } else {
            // Otherwise, update the stack immediately and navigate to the new page.
            this.stack = stack;
            this._swiper.update();

            // Wait for the new stack to be rendered before sliding to the new page.
            wait(1).then(() => {
                if (forwardOnePage) {
                    this._swiper.slideNext(transitionMs);
                } else {
                    // Jump instantly to the active page.
                    this._swiper.slideTo(stack.length - 1, 0);
                }
            });
        }
    }
}
