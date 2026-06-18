import {HoistModel} from '@xh/hoist/core';
import {makeObservable} from '@xh/hoist/mobx';
import {isNil} from 'lodash';
import {action, computed, observable} from 'mobx';
import {createRef} from 'react';

/**
 * Internal model for the Scroller component. Used to manage the scroll state and provide
 * scroll functionality. Uses animation frames to ensure smooth scrolling.
 * @internal
 */

export class ScrollerModel extends HoistModel {
    contentRef = createRef<HTMLDivElement>();

    @observable private scrollStart: number;
    @observable private scrollSize: number;
    @observable private clientSize: number;

    private animationFrameId: number;

    @computed
    get showScrollButtons(): boolean {
        return this.scrollSize > this.clientSize;
    }

    @computed
    get isScrolledToStart(): boolean {
        return this.scrollStart === 0;
    }

    @computed
    get isScrolledToEnd(): boolean {
        // Allow for a 1px buffer to account for rounding errors
        return this.scrollStart + this.clientSize >= this.scrollSize - 1;
    }

    get isHorizontal(): boolean {
        return this.componentProps.orientation !== 'vertical';
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override afterLinked() {
        this.contentRef.current.addEventListener('scroll', () => this.onViewportEvent());
    }

    scroll(direction: 'forward' | 'backward') {
        this.stopScrolling();
        this.animationFrameId = window.requestAnimationFrame(() => {
            const {current} = this.contentRef;
            if (
                !current ||
                (direction === 'backward' && this.isScrolledToStart) ||
                (direction === 'forward' && this.isScrolledToEnd)
            ) {
                this.stopScrolling();
                return;
            }
            if (this.isHorizontal) {
                current.scrollLeft += direction === 'backward' ? -10 : 10;
            } else {
                current.scrollTop += direction === 'backward' ? -10 : 10;
            }
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
        const {contentRef, isHorizontal} = this,
            {current} = contentRef;
        this.scrollStart = isHorizontal ? current.scrollLeft : current.scrollTop;
        this.scrollSize = isHorizontal ? current.scrollWidth : current.scrollHeight;
        this.clientSize = isHorizontal ? current.clientWidth : current.clientHeight;
    }

    override destroy() {
        this.stopScrolling();
        super.destroy();
    }
}
