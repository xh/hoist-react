/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridLocalModel, GridModel} from '@xh/hoist/cmp/grid';
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, HoistProps, useLocalModel} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {observeResize} from '@xh/hoist/utils/js';
import {sumBy} from 'lodash';
import {createRef, RefObject} from 'react';

/**
 * Implementation for Grid's full-width horizontal scrollbar, to span pinned columns
 * @internal
 */

export interface GridHScrollbarProps extends HoistProps<GridModel> {
    gridLocalModel: GridLocalModel;
}

export const gridHScrollbar = hoistCmp.factory<GridHScrollbarProps>({
    className: 'xh-grid__grid-hscrollbar',
    render({className}) {
        const impl = useLocalModel(GridHScrollbarModel),
            {scrollerRef, viewWidth, visibleColumnWidth, SCROLLBAR_SIZE} = impl;

        if (viewWidth > visibleColumnWidth) return null;

        return div({
            className,
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
                height: SCROLLBAR_SIZE, // TODO: make this a property on GridModel to apply to both scrollbars
                overflowX: 'auto',
                overflowY: 'hidden'
            }
        });
    }
});

class GridHScrollbarModel extends HoistModel {
    readonly SCROLLBAR_SIZE = 10;
    readonly scrollerRef = createRef<HTMLDivElement>();

    @observable viewWidth: number;
    @observable private isVerticalScrollbarVisible = false;

    /** Observe AG's viewport to detect when vertical scrollbar visibility changes */
    private agViewportResizeObserver: ResizeObserver;
    /** Observe overall view to detect when horizontal scrollbar is needed */
    private viewResizeObserver: ResizeObserver;

    get visibleColumnWidth(): number {
        const {gridModel, SCROLLBAR_SIZE} = this;
        return (
            sumBy(gridModel.columnState, ({colId, hidden, width}) => {
                if (hidden) return 0;
                const minWidth = gridModel.getColumn(colId).minWidth ?? 0;
                if (width) return Math.max(width, minWidth);
                return minWidth;
            }) + (this.isVerticalScrollbarVisible ? SCROLLBAR_SIZE : 0)
        );
    }

    private get agViewport(): HTMLDivElement {
        return this.viewRef.current.querySelector('.ag-center-cols-viewport');
    }

    private get agVerticalScrollContainer(): HTMLDivElement {
        return this.viewRef.current.querySelector('.ag-body-vertical-scroll-container');
    }

    private get gridModel(): GridModel {
        return this.componentProps.model as GridModel;
    }

    private get viewRef(): RefObject<HTMLElement> {
        return this.componentProps.gridLocalModel.viewRef;
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
            when: () => this.viewRef.current && this.gridModel.isReady,
            run: () => {
                const {agViewport, viewRef} = this;
                this.viewWidth = viewRef.current.clientWidth;
                agViewport.addEventListener('scroll', e =>
                    this.scrollScroller((e.target as HTMLDivElement).scrollLeft)
                );
                this.agViewportResizeObserver = observeResize(
                    () => this.onAgViewportResized(),
                    agViewport,
                    {debounce: 100}
                );
                this.viewResizeObserver = observeResize(
                    rect => this.onViewResized(rect),
                    viewRef.current,
                    {debounce: 100}
                );
            }
        });
    }

    override destroy() {
        super.destroy();
        this.agViewportResizeObserver?.disconnect();
        this.viewResizeObserver?.disconnect();
    }

    @action
    private onAgViewportResized() {
        this.isVerticalScrollbarVisible = !!this.agVerticalScrollContainer.clientHeight;
    }

    @action
    private onViewResized({width}: DOMRect) {
        this.viewWidth = width;
    }
}
