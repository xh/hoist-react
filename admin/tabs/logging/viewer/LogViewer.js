/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {hframe, vframe, frame, filler} from 'hoist/layout';
import {grid} from 'hoist/grid';
import {resizable, loadMask, storeFilterField, toolbar} from 'hoist/cmp';
import {logViewerDisplay} from './LogViewerDisplay';
import {LogViewerModel} from './LogViewerModel';
import {logViewerToolbar} from './LogViewerToolbar';
import './LogViewer.scss';

@hoistComponent()
export class LogViewer extends Component {
    localModel = new LogViewerModel();

    async loadAsync() {
        return this.model.loadAsync();
    }

    render() {
        return frame(
            this.getContents()
        );
    }

    getContents() {
        const model = this.model,
            {files, loadModel} = model;

        return hframe({
            cls: 'xh-log-viewer',
            items: [
                resizable({
                    side: 'left',
                    contentSize: '250px',
                    item: vframe(
                        grid({model: files}),
                        toolbar(
                            filler(),
                            storeFilterField({
                                store: files.store,
                                fields: ['filename']
                            })
                        )
                    )
                }),
                vframe(
                    logViewerToolbar({model}),
                    logViewerDisplay({model})
                ),
                loadMask({model: loadModel})
            ]
        });
    }
}