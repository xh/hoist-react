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
 * Dashboard-style container that allows users to drag-and-drop child widgets into flexible layouts.
 *
 * Unlike its cousin {@see DashContainer}, this component scales the width only of its child
 * widgets as its overall size changes, leaving heights unchanged and scrolling internally as
 * necessary. This makes it a good candidate for report-style dashboards containing lots of content
 * that is unlikely to fit or compress nicely on smaller screens. Consider DashContainer when
 * a space-filling layout is a priority.
 *
 * @see DashCanvasModel
 */
export const [DashCanvas, dashCanvas] = hoistCmp.withFactory({
    displayName: 'DashCanvas',
    className: 'xh-dash-canvas',
    model: uses(DashCanvasModel),
    render({className, model}) {
        const isDraggable = !model.layoutLocked,
            isResizable = !model.layoutLocked;

        return div({
            className: classNames(
                className,
                isDraggable ? `${className}--draggable` : null,
                isResizable ? `${className}--resizable` : null
            ),
            ref: model.ref,
            onContextMenu: (e) => onContextMenu(e, model),
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
                    draggableCancel: '.xh-button',
                    onLayoutChange: layout => model.setLayout(layout),
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

const onContextMenu = (e, model) => {
    const {classList} = e.target;
    if (classList.contains('react-grid-layout') ||
            classList.contains('react-resizable-handle') ||
            classList.contains('xh-dash-canvas')
    ) {
        const {clientX, clientY} = e,
            x = clientX + model.ref.current.scrollLeft,
            y = clientY + model.ref.current.scrollTop;
        ContextMenu.show(
            dashCanvasContextMenu({
                dashCanvasModel: model,
                position: {x, y}
            }),
            {left: clientX, top: clientY},
            null,
            XH.darkTheme
        );
    }
};

const reactGridLayout = elemFactory(WidthProvider(ReactGridLayout));
