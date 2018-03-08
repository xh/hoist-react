/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {hframe, vframe, frame} from 'hoist/layout';
import {grid} from 'hoist/grid';
import {collapsible, loadMask, storeFilterField} from 'hoist/cmp';

import {logViewerDisplay} from './LogViewerDisplay';
import {LogViewerModel} from './LogViewerModel';
import {logViewerToolbar} from './LogViewerToolbar';
import './LogViewer.css';

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

        return hframe(
            collapsible({
                side: 'left',
                contentSize: '250px',
                item: vframe(
                    grid({
                        model: files,
                        gridOptions: {
                            defaultColDef: {suppressMenu: true}
                        }
                    }),
                    storeFilterField({
                        store: files.store,
                        fields: ['filename']
                    })
                )
            }),
            vframe(
                logViewerToolbar({model}),
                logViewerDisplay({model})
            ),
            loadMask({model: loadModel})
        );
    }
}