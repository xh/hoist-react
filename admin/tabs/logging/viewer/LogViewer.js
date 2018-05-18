/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from 'hoist/core';
import {filler, hframe, resizable, panel} from 'hoist/cmp/layout';
import {grid} from 'hoist/cmp/grid';
import {loadMask} from 'hoist/cmp/mask';
import {toolbar} from 'hoist/cmp/toolbar';
import {storeFilterField} from 'hoist/cmp/store';

import {logViewerDisplay} from './LogViewerDisplay';
import {LogViewerModel} from './LogViewerModel';
import {logViewerToolbar} from './LogViewerToolbar';
import './LogViewer.scss';

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
            cls: 'xh-log-viewer',
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