import {ContextMenu} from '@blueprintjs/core';
import {
    dashGridLayoutContainerContextMenu
} from '@xh/hoist/desktop/cmp/dashGrid/impl/DashGridLayoutContainerContextMenu';
import {div} from '../../../cmp/layout';
import {elemFactory, hoistCmp, uses, XH} from '../../../core';
import {dashGridLayoutView} from '@xh/hoist/desktop/cmp/dashGrid/impl/DashGridLayoutView';
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
            className,
            ref: model.ref,
            onContextMenu: (e) => {
                model.setNextPosition(e.clientX, e.clientY);
                ContextMenu.show(
                    dashGridLayoutContainerContextMenu({dashGridLayoutContainerModel: model}),
                    {left: e.clientX, top: e.clientY},
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
