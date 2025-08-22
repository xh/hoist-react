import {HoistModel} from '@xh/hoist/core';
import {makeObservable} from '@xh/hoist/mobx';
import {isNil} from 'lodash';
import {action, computed, observable} from 'mobx';
import {createRef} from 'react';

/**
 * Internal model for the HScroller component. Used to manage the scroll state and provide
 * scroll functionality. Uses animation frames to ensure smooth scrolling.
 */

export class HScrollerModel extends HoistModel {
    contentRef = createRef<HTMLDivElement>();

    @observable private scrollLeft: number;
    @observable private scrollWidth: number;
    @observable private clientWidth: number;

    private animationFrameId: number;

    @computed
    get showScrollButtons(): boolean {
        return this.scrollWidth > this.clientWidth;
    }

    @computed
    get isScrolledToLeft(): boolean {
        return this.scrollLeft === 0;
    }

    @computed
    get isScrolledToRight(): boolean {
        // Allow for a 1px buffer to account for rounding errors discovered when testing
        return this.scrollLeft + this.clientWidth >= this.scrollWidth - 1;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override afterLinked() {
        this.contentRef.current.addEventListener('scroll', () => this.onViewportEvent());
    }

    scroll(direction: 'left' | 'right') {
        this.stopScrolling();
        this.animationFrameId = window.requestAnimationFrame(() => {
            const {current} = this.contentRef;
            if (
                !current ||
                (direction === 'left' && this.isScrolledToLeft) ||
                (direction === 'right' && this.isScrolledToRight)
            ) {
                this.stopScrolling();
                return;
            }
            current.scrollLeft += direction === 'left' ? -10 : 10;
            this.scroll(direction);
        });
    }

    stopScrolling() {
        if (!isNil(this.animationFrameId)) {
            window.cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    @action
    onViewportEvent() {
        const {scrollLeft, scrollWidth, clientWidth} = this.contentRef.current;
        this.scrollLeft = scrollLeft;
        this.scrollWidth = scrollWidth;
        this.clientWidth = clientWidth;
    }

    override destroy() {
        this.stopScrolling();
        super.destroy();
    }
}
