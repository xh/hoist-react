import {ContextMenu} from '@blueprintjs/core';
import {div} from '@xh/hoist/cmp/layout';
import {elemFactory, hoistCmp, uses, XH} from '@xh/hoist/core';
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
            isResizable = !model.layoutLocked;

        return div({
            className: classNames(
                className,
                isDraggable ? `${className}--draggable` : null,
                isResizable ? `${className}--resizable` : null
            ),
            ref: model.ref,
            onContextMenu: (e) => {
                const {clientX: x, clientY: y} = e;
                ContextMenu.show(
                    dashCanvasContextMenu({
                        dashCanvasModel: model,
                        clickPosition: {x, y}
                    }),
                    {left: x, top: y},
                    null,
                    XH.darkTheme
                );
            },
            item: reactGridLayout({
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
            })
        });
    }
});

DashCanvas.propTypes = {
    model: PT.oneOfType([PT.instanceOf(DashCanvasModel), PT.object])
};

const reactGridLayout = elemFactory(WidthProvider(ReactGridLayout));
