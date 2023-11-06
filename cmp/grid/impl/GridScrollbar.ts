import {GridModel} from '@xh/hoist/cmp/grid';
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, HoistProps, useLocalModel} from '@xh/hoist/core';
import {makeObservable} from '@xh/hoist/mobx';
import {observeResize} from '@xh/hoist/utils/js';
import {sumBy} from 'lodash';
import {action, observable} from 'mobx';
import {createRef, RefObject} from 'react';

export interface GridScrollbarProps extends HoistProps<GridModel> {
    viewRef: RefObject<HTMLElement>;
}

export const gridScrollbar = hoistCmp.factory<GridScrollbarProps>({
    className: 'xh-grid__grid-scrollbar',
    render({className}) {
        const impl = useLocalModel(GridScrollbarModel),
            {scrollerRef, viewportWidth, visibleColumnWidth, SCROLLBAR_SIZE} = impl;

        return div({
            className,
            omit: viewportWidth > visibleColumnWidth,
            item: div({
                className: `${className}__filler`,
                style: {
                    height: SCROLLBAR_SIZE,
                    width: visibleColumnWidth
                }
            }),
            onScroll: e => {
                impl.scrollViewport((e.target as HTMLDivElement).scrollLeft);
            },
            ref: scrollerRef,
            style: {
                height: SCROLLBAR_SIZE,
                overflowX: 'auto',
                overflowY: 'hidden'
            }
        });
    }
});

class GridScrollbarModel extends HoistModel {
    readonly SCROLLBAR_SIZE = 10;
    readonly scrollerRef = createRef<HTMLDivElement>();

    @observable viewportWidth: number;
    @observable private isVerticalScrollbarVisible = false;

    private viewportResizeObserver: ResizeObserver;

    get visibleColumnWidth(): number {
        const {model, SCROLLBAR_SIZE} = this;
        return (
            sumBy(model.columnState, it =>
                it.hidden ? 0 : it.width ?? model.getColumn(it.colId).minWidth ?? 0
            ) + (this.isVerticalScrollbarVisible ? SCROLLBAR_SIZE : 0)
        );
    }

    private get agViewport(): HTMLDivElement {
        return this.viewRef.current.querySelector('.ag-center-cols-viewport');
    }

    private get agVerticalScrollContainer(): HTMLDivElement {
        return this.viewRef.current.querySelector('.ag-body-vertical-scroll-container');
    }

    private get model(): GridModel {
        return this.componentProps.model as GridModel;
    }

    private get viewRef(): RefObject<HTMLElement> {
        return this.componentProps.viewRef;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    scrollScroller(left: number) {
        this.scrollerRef.current.scrollLeft = left;
    }

    scrollViewport(left: number) {
        this.agViewport.scrollLeft = left;
    }

    override afterLinked() {
        this.addReaction({
            when: () => !!this.viewRef.current && this.model.isReady,
            run: () => {
                const {agViewport, viewportResizeObserver} = this;
                this.viewportWidth = agViewport.clientWidth;
                agViewport.addEventListener('scroll', e =>
                    this.scrollScroller((e.target as HTMLDivElement).scrollLeft)
                );
                viewportResizeObserver?.disconnect();
                this.viewportResizeObserver = observeResize(
                    rect => this.onViewResized(rect),
                    agViewport,
                    {debounce: 100}
                );
            }
        });
    }

    override destroy() {
        super.destroy();
        this.viewportResizeObserver?.disconnect();
    }

    @action
    private onViewResized({width}: DOMRect) {
        this.viewportWidth = width;
        this.isVerticalScrollbarVisible = !!this.agVerticalScrollContainer.clientHeight;
    }
}
