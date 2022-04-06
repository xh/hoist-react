import {ContextMenu} from '@blueprintjs/core';
import {div} from '@xh/hoist/cmp/layout';
import {elemFactory, hoistCmp, uses, XH} from '@xh/hoist/core';
import classNames from 'classnames';
import PT from 'prop-types';

import ReactGridLayout, {WidthProvider} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import './DashReport.scss';
import {DashReportModel} from './DashReportModel';
import {dashReportContextMenu} from './impl/DashReportContextMenu';
import {dashReportView} from './impl/DashReportView';

const reactGridLayout = elemFactory(WidthProvider(ReactGridLayout));

export const [DashReport, dashReport] = hoistCmp.withFactory({
    displayName: 'DashReport',
    className: 'xh-dash-report',
    model: uses(DashReportModel),
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
                    dashReportContextMenu({
                        dashReportModel: model,
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
                    item: dashReportView({model: vm})
                }))
            })
        });
    }
});

DashReport.propTypes = {
    model: PT.oneOfType([PT.instanceOf(DashReportModel), PT.object])
};