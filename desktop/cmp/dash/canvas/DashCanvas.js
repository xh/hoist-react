import {ContextMenu} from '@blueprintjs/core';
import {div, vbox, vspacer} from '@xh/hoist/cmp/layout';
import {elemFactory, hoistCmp, uses, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {Classes, overlay, popover} from '@xh/hoist/kit/blueprint';
import classNames from 'classnames';
import PT from 'prop-types';

import ReactGridLayout, {WidthProvider} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import './DashCanvas.scss';
import {DashCanvasModel} from './DashCanvasModel';
import {dashCanvasContextMenu} from './impl/DashCanvasContextMenu';
import {dashCanvasView} from './impl/DashCanvasView';

/**
 * Display a "canvas" of child components in accordance with a DashCanvasModel
 * @see DashCanvasModel
 *
 * -------- !! NOTE: THIS COMPONENT IS CURRENTLY IN BETA !! --------
 * -- Its API is under development and subject to breaking changes --
 *
 * @Beta
 */
export const [DashCanvas, dashCanvas] = hoistCmp.withFactory({
    displayName: 'DashCanvas',
    className: 'xh-dash-canvas',
    model: uses(DashCanvasModel),
    render({className, model}) {
        const isDraggable = !model.layoutLocked,
            isResizable = !model.layoutLocked,
            {ref} = model;

        return div({
            className: classNames(
                className,
                isDraggable ? `${className}--draggable` : null,
                isResizable ? `${className}--resizable` : null
            ),
            ref,
            onContextMenu: (e) => {
                const {classList} = e.target;
                if (classList.contains('react-grid-layout') || classList.contains('react-resizable-handle')|| classList.contains('xh-dash-canvas')) {
                    const {clientX, clientY} = e,
                        x = clientX + ref.current.scrollLeft,
                        y = clientY + ref.current.scrollTop;
                    ContextMenu.show(
                        dashCanvasContextMenu({
                            dashCanvasModel: model,
                            clickPosition: {x, y}
                        }),
                        {left: clientX, top: clientY},
                        null,
                        XH.darkTheme
                    );
                }
            },
            items: [
                reactGridLayout({
                    layout: model.layout,
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
                    draggableHandle: '.xh-panel > .xh-panel__content > .xh-panel-header',
                    // Resizing always pins to the nw corner, so dragging from anywhere other than se sides/corner is unintuitive
                    resizeHandles: ['s', 'e', 'se'],
                    onLayoutChange: (layout) => model.setLayout(layout),
                    items: model.viewModels.map(vm => div({
                        key: vm.id,
                        item: dashCanvasView({model: vm})
                    }))
                }),
                emptyContainerOverlay()
            ]
        });
    }
});

DashCanvas.propTypes = {
    model: PT.oneOfType([PT.instanceOf(DashCanvasModel), PT.object])
};

const emptyContainerOverlay = hoistCmp.factory(
    ({model}) => {
        const {isEmpty, emptyText, addViewButtonText} = model;
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
                items: [
                    div(emptyText),
                    vspacer(10),
                    popover({
                        interactionKind: 'click',
                        item: button({
                            icon: Icon.add(),
                            text: addViewButtonText
                        }),
                        content: dashCanvasContextMenu({
                            dashCanvasModel: model
                        })
                    })
                ]
            })
        });
    }
);

const reactGridLayout = elemFactory(WidthProvider(ReactGridLayout));
