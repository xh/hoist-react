/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import ReactGridLayout, {
    type Compactor,
    type LayoutItem,
    type GridLayoutProps,
    bottom,
    getCompactor
} from 'react-grid-layout';
import {correctBounds} from 'react-grid-layout/core';
import {GridBackground, type GridBackgroundProps, wrapCompactor} from 'react-grid-layout/extras';
import {useComposedRefs, useOnResize, useOnUnmount} from '@xh/hoist/utils/react';
import {div, vbox, vspacer} from '@xh/hoist/cmp/layout';
import {
    elementFactory,
    hoistCmp,
    HoistProps,
    refreshContextView,
    TestSupportProps,
    uses
} from '@xh/hoist/core';
import {dashCanvasAddViewButton} from '@xh/hoist/desktop/cmp/button/DashCanvasAddViewButton';
import '@xh/hoist/desktop/register';
import {Classes, overlay, showContextMenu} from '@xh/hoist/kit/blueprint';
import {consumeEvent, mergeDeep, TEST_ID} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {useCallback, useRef, useState} from 'react';
import {DashCanvasModel} from './DashCanvasModel';
import {dashCanvasContextMenu} from './impl/DashCanvasContextMenu';
import {dashCanvasView} from './impl/DashCanvasView';

import 'react-grid-layout/css/styles.css';
import './DashCanvas.scss';

export interface DashCanvasProps extends HoistProps<DashCanvasModel>, TestSupportProps {
    /**
     * Optional additional configuration options to pass through to the underlying ReactGridLayout component.
     * See the RGL documentation for details:
     * {@link https://www.npmjs.com/package/react-grid-layout#api-reference}
     * Note that some ReactGridLayout props are managed directly by DashCanvas and will be overridden if provided here.
     */
    rglOptions?: Partial<GridLayoutProps>;
}

/**
 * Dashboard-style container that allows users to drag-and-drop child widgets into flexible layouts.
 *
 * Unlike its cousin {@link DashContainer}, this component scales the width only of its child
 * widgets as its overall size changes, leaving heights unchanged and scrolling internally as
 * necessary. This makes it a good candidate for report-style dashboards containing lots of content
 * that is unlikely to fit or compress nicely on smaller screens. Consider DashContainer when
 * a space-filling layout is a priority.
 *
 * @see DashCanvasModel
 */
export const [DashCanvas, dashCanvas] = hoistCmp.withFactory<DashCanvasProps>({
    displayName: 'DashCanvas',
    className: 'xh-dash-canvas',
    model: uses(DashCanvasModel),

    render({className, model, rglOptions, testId}, ref) {
        const isDraggable = !model.layoutLocked,
            isResizable = !model.layoutLocked,
            // Measure container width ourselves and hold off rendering the grid until known, so
            // widgets render once at their final size. RGL's `useContainerWidth()` renders first
            // with a placeholder width, then relays out (and animates) every widget to the actual
            // width - costly churn while a dashboard is loading.
            [width, widthRef] = useContentWidth(),
            initialWidthMeasured = width != null,
            // Make RGL's rendered height available to the grid background.
            rglHeightRef = useOnResize(rect => (model.rglHeight = rect.height), {debounce: 100}),
            defaultDroppedItemDims = {
                w: Math.floor(model.columns / 3),
                h: Math.floor(model.columns / 3)
            },
            // If rglOptions.compactor object is provided, set it directly before
            // mergeDeep to avoid deep merging issues.
            compactor = rglOptions?.compactor
                ? rglOptions.compactor
                : model.compact === 'wrap'
                  ? wrapCompactor
                  : getCompactor(model.compact, false, false),
            // Grid height predicted from layout, needed only until RGL reports its actual height.
            expectedHeight =
                initialWidthMeasured && model.rglHeight != null
                    ? null
                    : expectedGridHeight(model, compactor);

        return refreshContextView({
            model: model.refreshContextModel,
            item: div({
                className: classNames(
                    className,
                    isDraggable ? `${className}--draggable` : null,
                    isResizable ? `${className}--resizable` : null
                ),
                ref: useComposedRefs(ref, model.ref, widthRef),
                onContextMenu: e => onContextMenu(e, model),
                items: [
                    // Until width is measured, reserve the grid's expected height so that any
                    // vertical scrollbar is already present when we measure - otherwise its later
                    // appearance narrows the canvas and triggers a second relayout of all widgets.
                    div({omit: initialWidthMeasured, style: {height: expectedHeight}}),
                    gridBackgroundCells({
                        omit:
                            !model.showGridBackground ||
                            !initialWidthMeasured ||
                            (model.isEmpty && !model.draggedInView),
                        width,
                        // Until RGL is measured, size to the expected height - the background's own
                        // default of 10 rows could overflow a short canvas and add a scrollbar.
                        height: model.rglHeight ?? expectedHeight
                    }),
                    reactGridLayout({
                        ...mergeDeep(
                            {
                                gridConfig: {
                                    cols: model.columns,
                                    rowHeight: model.rowHeight,
                                    margin: model.margin,
                                    maxRows: model.maxRows,
                                    containerPadding: model.containerPadding
                                },
                                dragConfig: {
                                    enabled: isDraggable,
                                    handle: '.xh-dash-tab.xh-panel > .xh-panel__inner > .xh-panel-header',
                                    cancel: '.xh-button',
                                    bounded: true
                                },
                                resizeConfig: {
                                    enabled: isResizable
                                },
                                dropConfig: {
                                    enabled: model.contentLocked ? false : model.allowsDrop,
                                    defaultItem: defaultDroppedItemDims,
                                    onDragOver: (evt: DragEvent) => model.onDropDragOver(evt)
                                },
                                onDrop: (
                                    layout: LayoutItem[],
                                    layoutItem: LayoutItem,
                                    evt: Event
                                ) => model.onDrop(layout, layoutItem, evt),
                                compactor,
                                onLayoutChange: (layout: LayoutItem[]) =>
                                    model.onRglLayoutChange(layout),
                                onResizeStart: () => (model.isResizing = true),
                                onResizeStop: () => (model.isResizing = false)
                            },
                            rglOptions
                        ),
                        omit: !initialWidthMeasured,
                        innerRef: rglHeightRef,
                        layout: model.rglLayout,
                        children: model.viewModels.map(vm =>
                            div({
                                key: vm.id,
                                item: dashCanvasView({model: vm})
                            })
                        ),
                        width
                    }),
                    emptyContainerOverlay({
                        omit: !initialWidthMeasured || !model.showAddViewButtonWhenEmpty
                    })
                ],
                [TEST_ID]: testId
            })
        });
    }
});

const gridBackgroundCells = hoistCmp.factory<DashCanvasModel>({
    displayName: 'DashCanvasGridBackgroundCells',
    model: uses(DashCanvasModel),
    render({model, width, height}) {
        return gridBackground({
            className: 'xh-dash-canvas__grid-background',
            width,
            height,
            cols: model.columns,
            rowHeight: model.rowHeight,
            margin: model.margin,
            containerPadding: model.containerPadding,
            rows: 'auto',
            color: 'var(--xh-dash-canvas-grid-cell-color)',
            borderRadius: 0,
            // Clip to the grid - `rows: 'auto'` rounds up, and a partial extra row would overflow.
            style: {height}
        });
    }
});

const emptyContainerOverlay = hoistCmp.factory<DashCanvasModel>(({model}) => {
    const {isEmpty, emptyText} = model;
    if (!isEmpty) return null;

    return overlay({
        className: `xh-dash-canvas--empty-overlay ${Classes.OVERLAY_SCROLL_CONTAINER}`,
        autoFocus: true,
        isOpen: true,
        canEscapeKeyClose: false,
        usePortal: false,
        enforceFocus: false,
        item: vbox({
            alignItems: 'center',
            items: [div(emptyText), vspacer(10), dashCanvasAddViewButton()]
        })
    });
});

const onContextMenu = (e, model) => {
    const {classList} = e.target;
    if (
        classList.contains('react-grid-layout') ||
        classList.contains('react-resizable-handle') ||
        classList.contains('xh-dash-canvas')
    ) {
        const {clientX, clientY} = e,
            x = clientX + model.ref.current.scrollLeft,
            y = clientY + model.ref.current.scrollTop;

        consumeEvent(e);
        showContextMenu(
            dashCanvasContextMenu({
                dashCanvasModel: model,
                position: {x, y},
                contextMenuEvent: e
            }),
            {left: clientX, top: clientY}
        );
    }
};

/**
 * Track the content width of the canvas. Zero-width updates (e.g. while hidden) are skipped, but
 * unlike `useOnResize()` a zero height is not - an empty canvas in an unsized parent must measure.
 */
function useContentWidth(): [number, (node: HTMLElement) => void] {
    const [width, setWidth] = useState<number>(null),
        observer = useRef<ResizeObserver>(null);
    useOnUnmount(() => observer.current?.disconnect());

    const ref = useCallback((node: HTMLElement) => {
        observer.current?.disconnect();
        observer.current = null;
        if (!node) return;
        observer.current = new ResizeObserver(([entry]) => {
            const newWidth = Math.round(entry.contentRect.width);
            if (newWidth) setWidth(newWidth);
        });
        observer.current.observe(node);
    }, []);

    return [width, ref];
}

/** Height RGL will render for the current layout - mirrors its internal calculation. */
function expectedGridHeight(model: DashCanvasModel, compactor: Compactor): number {
    const {rowHeight, margin, containerPadding, columns: cols} = model,
        layout = compactor.compact(correctBounds(model.rglLayout, {cols}), cols),
        rows = bottom(layout),
        padY = (containerPadding ?? margin)[1];
    return Math.max(0, rows * rowHeight + (rows - 1) * margin[1] + 2 * padY);
}

const reactGridLayout = elementFactory<GridLayoutProps>(ReactGridLayout);
const gridBackground = elementFactory<GridBackgroundProps>(GridBackground);
