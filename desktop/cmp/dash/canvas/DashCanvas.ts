/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {DragEvent} from 'react';
import ReactGridLayout, {
    type LayoutItem,
    type GridLayoutProps,
    useContainerWidth,
    getCompactor
} from 'react-grid-layout';
import {GridBackground, type GridBackgroundProps} from 'react-grid-layout/extras';
import composeRefs from '@seznam/compose-react-refs';
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
            {width, containerRef, mounted} = useContainerWidth(),
            defaultDroppedItemDims = {
                w: Math.floor(model.columns / 3),
                h: Math.floor(model.columns / 3)
            };

        return refreshContextView({
            model: model.refreshContextModel,
            item: div({
                className: classNames(
                    className,
                    isDraggable ? `${className}--draggable` : null,
                    isResizable ? `${className}--resizable` : null
                ),
                ref: composeRefs(ref, model.ref, containerRef),
                onContextMenu: e => onContextMenu(e, model),
                items: [
                    gridBackgroundCells({
                        omit: !model.showGridBackground || !mounted,
                        width
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
                                    handle: '.xh-dash-tab.xh-panel > .xh-panel__content > .xh-panel-header',
                                    cancel: '.xh-button',
                                    bounded: true
                                },
                                resizeConfig: {
                                    enabled: isResizable
                                },
                                dropConfig: {
                                    enabled: model.contentLocked ? false : model.allowsDrop,
                                    defaultItem: defaultDroppedItemDims,
                                    ...(rglOptions?.dropConfig ?? {})
                                },
                                onDropDragOver: (evt: DragEvent) => model.onDropDragOver(evt),
                                onDrop: (
                                    layout: LayoutItem[],
                                    layoutItem: LayoutItem,
                                    evt: Event
                                ) => model.onDrop(layout, layoutItem, evt),
                                compactor: getCompactor(model.compact, false, false),
                                onLayoutChange: (layout: LayoutItem[]) =>
                                    model.onRglLayoutChange(layout),
                                onResizeStart: () => (model.isResizing = true),
                                onResizeStop: () => (model.isResizing = false)
                            },
                            rglOptions
                        ),
                        omit: !mounted,
                        layout: model.rglLayout,
                        children: model.viewModels.map(vm =>
                            div({
                                key: vm.id,
                                item: dashCanvasView({model: vm})
                            })
                        ),
                        width
                    }),
                    emptyContainerOverlay({omit: !mounted || !model.showAddViewButtonWhenEmpty})
                ],
                [TEST_ID]: testId
            })
        });
    }
});

const gridBackgroundCells = hoistCmp.factory<DashCanvasModel>({
    displayName: 'DashCanvasGridBackgroundCells',
    model: uses(DashCanvasModel),
    render({model, width}) {
        return gridBackground({
            className: 'xh-dash-canvas__grid-background',
            width,
            height: model.rglHeight,
            cols: model.columns,
            rowHeight: model.rowHeight,
            margin: model.margin,
            rows: 'auto',
            color: 'var(--xh-dash-canvas-grid-cell-color)',
            borderRadius: 0
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

const reactGridLayout = elementFactory<GridLayoutProps>(ReactGridLayout);
const gridBackground = elementFactory<GridBackgroundProps>(GridBackground);
