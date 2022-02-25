import {ContextMenu} from '@blueprintjs/core';
import {div} from '../../../cmp/layout';
import {elemFactory, hoistCmp, uses, XH} from '../../../core';
import {dashContainerContextMenu} from '../dash/impl/DashContainerContextMenu';
import {dashView} from '../dash/impl/DashView';
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
            onContextMenu: (e) => {
                ContextMenu.show(
                    dashContainerContextMenu({dashContainerModel: model}),
                    {left: e.clientX, top: e.clientY},
                    null,
                    XH.darkTheme
                );
            },
            item: reactGridLayout({
                layout: model.layout,
                cols: model.columns,
                rowHeight: model.rowHeight,
                compactType: 'vertical',
                autoSize: true,
                isBounded: true,
                draggableHandle: '.xh-panel-header',
                onLayoutChange: (layout) => model.setLayout(layout),
                items: model.viewModels.map(vm => div({
                    key: vm.id,
                    item: dashView({model: vm})
                }))
            })
        });
    }
});
