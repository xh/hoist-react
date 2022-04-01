import {ContextMenu} from '@blueprintjs/core';
import classNames from 'classnames';
import {div} from '@xh/hoist/cmp/layout';
import {elemFactory, hoistCmp, uses, XH} from '@xh/hoist/core';
import {dashGridLayoutView} from './impl/DashGridLayoutView';
import {dashGridLayoutContainerContextMenu} from './impl/DashGridLayoutContainerContextMenu';
import {DashGridLayoutContainerModel} from './DashGridLayoutContainerModel';
import './DashGridLayoutContainer.scss';

import ReactGridLayout, {WidthProvider} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
const reactGridLayout = elemFactory(WidthProvider(ReactGridLayout));

export const dashGridLayoutContainer = hoistCmp.factory({
    className: 'dash-grid-layout-container',
    model: uses(DashGridLayoutContainerModel),
    render({className, model}) {
        return div({
            className: classNames(
                className,
                model.isDraggable ? `${className}--draggable` : null,
                model.isResizable ? `${className}--resizable` : null
            ),
            ref: model.ref,
            onContextMenu: (e) => {
                const {clientX: x, clientY: y} = e;
                ContextMenu.show(
                    dashGridLayoutContainerContextMenu({dashGridLayoutContainerModel: model,
                        clickPosition: {x, y}}),
                    {left: x, top: y},
                    null,
                    XH.darkTheme
                );
            },
            item: reactGridLayout({
                layout: model.layout,
                cols: model.columns,
                rowHeight: model.rowHeight,
                isDraggable: model.isDraggable,
                isResizable: model.isResizable,
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
                    item: dashGridLayoutView({model: vm})
                }))
            })
        });
    }
});
