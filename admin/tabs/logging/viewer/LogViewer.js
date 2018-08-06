/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {filler, hframe} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {resizable} from '@xh/hoist/desktop/cmp/resizable';
import {grid} from '@xh/hoist/desktop/cmp/grid';
import {loadMask} from '@xh/hoist/desktop/cmp/mask';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {storeFilterField} from '@xh/hoist/desktop/cmp/store';

import {logViewerDisplay} from './LogViewerDisplay';
import {LogViewerModel} from './LogViewerModel';
import {logViewerToolbar} from './LogViewerToolbar';
import './LogViewer.scss';

/**
 * @private
 */
@HoistComponent()
export class LogViewer extends Component {
    localModel = new LogViewerModel();

    async loadAsync() {
        return this.model.loadAsync();
    }

    render() {
        const model = this.model,
            {files, loadModel} = model;

        return hframe({
            className: 'xh-log-viewer',
            items: [
                resizable({
                    side: 'right',
                    contentSize: 250,
                    isOpen: true,
                    item: panel({
                        item: grid({model: files}),
                        bbar: toolbar(
                            filler(),
                            storeFilterField({
                                store: files.store,
                                fields: ['filename']
                            })
                        )
                    })
                }),
                panel({
                    tbar: logViewerToolbar({model}),
                    item: logViewerDisplay({model})
                }),
                loadMask({model: loadModel})
            ]
        });
    }

}