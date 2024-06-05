/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {showContextMenu} from '@xh/hoist/kit/blueprint';
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
import {Classes, overlay} from '@xh/hoist/kit/blueprint';
import {TEST_ID} from '@xh/hoist/utils/js';
import {useOnVisibleChange} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {RefAttributes} from 'react';
import ReactGridLayout, {WidthProvider} from 'react-grid-layout';
import {DashCanvasModel} from './DashCanvasModel';
import {dashCanvasContextMenu} from './impl/DashCanvasContextMenu';
import {dashCanvasView} from './impl/DashCanvasView';

import 'react-grid-layout/css/styles.css';
import './DashCanvas.scss';

export type DashCanvasProps = HoistProps<DashCanvasModel> &
    TestSupportProps &
    RefAttributes<HTMLDivElement>;

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

    render({className, model, testId}, ref) {
        const isDraggable = !model.layoutLocked,
            isResizable = !model.layoutLocked;

        ref = composeRefs(
            ref,
            model.ref,
            useOnVisibleChange(viz => model.onVisibleChange(viz))
        );

        return refreshContextView({
            model: model.refreshContextModel,
            item: div({
                className: classNames(
                    className,
                    isDraggable ? `${className}--draggable` : null,
                    isResizable ? `${className}--resizable` : null
                ),
                ref,
                onContextMenu: e => onContextMenu(e, model),
                items: [
                    reactGridLayout({
                        layout: model.rglLayout,
                        cols: model.columns,
                        rowHeight: model.rowHeight,
                        isDraggable,
                        isResizable,
                        compactType: model.compact ? 'vertical' : null,
                        margin: model.margin,
                        maxRows: model.maxRows,
                        containerPadding: model.containerPadding,
                        autoSize: true,
                        isBounded: true,
                        draggableHandle:
                            '.xh-dash-tab.xh-panel > .xh-panel__content > .xh-panel-header',
                        draggableCancel: '.xh-button',
                        onLayoutChange: layout => model.onRglLayoutChange(layout),
                        onResizeStart: () => (model.isResizing = true),
                        onResizeStop: () => (model.isResizing = false),
                        items: model.viewModels.map(vm =>
                            div({
                                key: vm.id,
                                item: dashCanvasView({model: vm})
                            })
                        )
                    }),
                    emptyContainerOverlay()
                ],
                [TEST_ID]: testId
            })
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

        showContextMenu(
            dashCanvasContextMenu({
                dashCanvasModel: model,
                position: {x, y}
            }),
            {left: clientX, top: clientY}
        );
    }
};

const reactGridLayout = elementFactory(WidthProvider(ReactGridLayout));
