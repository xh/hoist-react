/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import './LogViewerPanel.css';
import {Component} from 'react';
import {observer, toJS} from 'hoist/mobx';
import {box, vbox, hbox} from 'hoist/layout';
import {baseCol} from 'hoist/columns/Core';
import {grid, GridModel} from 'hoist/grid';
import {button} from 'hoist/kit/semantic';

import {LogViewerPanelModel} from './LogViewerPanelModel';

@observer
export class LogViewerPanel extends Component {
    logViewerModel = new LogViewerPanelModel();
    gridModel = new GridModel({
        url: 'logViewerAdmin/listFiles',
        columns: [
            baseCol({headerName: 'Log File', field: 'filename', width: 250})
        ],
        dataRoot: 'files'
    });


    loadAsync() {
        return this.gridModel.loadAsync();
    }

    render() {
        return hbox({
            cls: 'logviewer-panel',
            items: [
                box({
                    cls: this.model.collapsed ? 'collapsible-panel collapsed' : 'collapsible-panel expanded',
                    items: grid({
                        model: this.gridModel,
                        gridOptions: {
                            onCellClicked: this.model.loadFile
                        }
                    })
                }),
                vbox({
                    width: 10,
                    style: {
                        background: '#959b9e'
                    },
                    justifyContent: 'center',
                    alignItems: 'center',
                    items: button({
                        size: 'small',
                        cls: 'resizer',
                        compact: true,
                        icon: {name: `${this.model.collapsed ? 'right': 'left'} chevron`, color: 'blue'},
                        style: {
                            margin: 0,
                            padding: 0,
                            width: '10px',
                            height: '70px'
                        },
                        onClick: this.model.toggleLogPanel
                    })
                }),
                vbox({
                    cls: 'logviewer-container',
                    items: [
                        hbox({
                            cls: 'toolbar'
                        }),
                        vbox({
                            cls: 'log-display',
                            items: toJS(this.model.fileContent)
                        })
                    ]
                })
            ]
        });
    }

    //--------------------------
    // Implementation
    //--------------------------
    get model() {return this.logViewerModel}
}
