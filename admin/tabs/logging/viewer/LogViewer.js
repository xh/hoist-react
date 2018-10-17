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
import {grid} from '@xh/hoist/desktop/cmp/grid';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {storeFilterField} from '@xh/hoist/desktop/cmp/store';

import {logViewerDisplay} from './LogViewerDisplay';
import {LogViewerModel} from './LogViewerModel';
import {logViewerToolbar} from './LogViewerToolbar';
import './LogViewer.scss';

/**
 * @private
 */
@HoistComponent
export class LogViewer extends Component {
    localModel = new LogViewerModel();

    async loadAsync() {
        return this.model.loadAsync();
    }

    render() {
        const {model} = this,
            {filesGridModel, filesSizingModel, loadModel} = model;

        return hframe({
            className: 'xh-log-viewer',
            items: [
                panel({
                    item: grid({model: filesGridModel}),
                    bbar: toolbar(
                        filler(),
                        storeFilterField({gridModel: filesGridModel})
                    ),
                    sizingModel: filesSizingModel
                }),
                panel({
                    tbar: logViewerToolbar({model}),
                    item: logViewerDisplay({model}),
                    mask: loadModel
                })
            ]
        });
    }
}