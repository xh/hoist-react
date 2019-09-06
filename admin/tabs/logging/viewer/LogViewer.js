/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistComponent, localModel, useModel} from '@xh/hoist/core';
import {filler, hframe} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {grid} from '@xh/hoist/cmp/grid';
import {storeFilterField} from '@xh/hoist/desktop/cmp/store';

import {logDisplay} from './LogDisplay';
import {LogViewerModel} from './LogViewerModel';
import {logViewerToolbar} from './LogViewerToolbar';
import './LogViewer.scss';

export const LogViewer = hoistComponent({
    model: localModel(LogViewerModel),

    render() {
        const {filesGridModel, logDisplayModel, loadModel, view} = useModel();

        return hframe({
            className: 'xh-log-viewer',
            ref: view.ref,
            items: [
                panel({
                    model: {
                        side: 'left',
                        defaultSize: 250,
                        showHeaderCollapseButton: false
                    },
                    item: grid({model: filesGridModel}),
                    bbar: [
                        filler(),
                        storeFilterField({gridModel: filesGridModel})
                    ]
                }),
                panel({
                    tbar: logViewerToolbar(),
                    item: logDisplay({model: logDisplayModel}),
                    mask: loadModel
                })
            ]
        });
    }
});