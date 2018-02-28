/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {toJS, autorun} from 'hoist/mobx';
import {hframe, vframe, frame} from 'hoist/layout';
import {grid} from 'hoist/grid';
import {collapsible, loadMask} from 'hoist/cmp';
import {logViewerDisplay} from './LogViewerDisplay';
import {LogViewerModel} from './LogViewerModel';
import {logViewerToolbar} from './LogViewerToolbar';
import './LogViewer.css';

@hoistComponent()
export class LogViewer extends Component {
    localModel = new LogViewerModel();

    loadAsync() {
        return this.model.loadAsync();
    }

    render() {
        return frame(
            this.getContents()
        );
    }

    getContents() {
        const {files, loadModel} = this.model,
            appLogFile = `${XH.appName.toLowerCase()}.log`;

        return hframe(
            collapsible({
                side: 'left',
                contentSize: '250px',
                item: grid({
                    model: files,
                    gridOptions: {
                        defaultColDef: {suppressMenu: true},
                        onRowDataChanged() {
                            this.api.forEachNode(node => node.setSelected(node.data.filename === appLogFile));
                        }
                    }
                })
            }),
            vframe({
                style: {border: '1px solid darkgrey'},
                items: [
                    logViewerToolbar({model: this.model}),
                    logViewerDisplay({model: this.model})
                ]
            }),
            loadMask({model: loadModel})
        );
    }
}