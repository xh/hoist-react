/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import './LogViewerPanel.css';
import {Component} from 'react';
import {observer, toJS} from 'hoist/mobx';
import {box, vbox, hbox, div} from 'hoist/layout';
import {grid} from 'hoist/grid';
import {button} from 'hoist/kit/semantic';

import {LogViewerPanelModel} from './LogViewerPanelModel';
import {logViewerPanelToolbar} from './LogViewerPanelToolbar';

@observer
export class LogViewerPanel extends Component {
    model = new LogViewerPanelModel();

    loadAsync() {
        return this.model.loadAsync();
    }

    render() {
        const {files, filesCollapsed, rows} = this.model;

        return hbox({
            cls: 'logviewer-panel',
            items: [
                box({
                    cls: filesCollapsed ? 'collapsible-panel collapsed' : 'collapsible-panel expanded',
                    items: grid({
                        model: files,
                        gridOptions: {
                            onCellClicked: this.onGridCellClicked
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
                        icon: {name: `${filesCollapsed ? 'right': 'left'} chevron`, color: 'blue'},
                        style: {
                            margin: 0,
                            padding: 0,
                            width: '10px',
                            height: '70px'
                        },
                        onClick: this.onResizerClicked
                    })
                }),
                vbox({
                    cls: 'logviewer-container',
                    items: [
                        logViewerPanelToolbar({
                            model: this.model
                        }),
                        vbox({
                            cls: 'log-display',
                            items: toJS(rows).map((row, idx) => {
                                return hbox({
                                    cls: 'row',
                                    items: [
                                        div({
                                            key: `row-number-${idx}`,
                                            cls: 'row-number',
                                            items: row[0].toString()
                                        }),
                                        div({
                                            key: `row-content-${idx}`,
                                            cls: 'row-content',
                                            items: row[1]
                                        })
                                    ]
                                });
                            })
                        })
                    ]
                })
            ]
        });
    }

    onGridCellClicked = (ctx) => {
        this.model.loadFile(ctx.data.filename);
    }

    onResizerClicked = (ctx) => {
        this.model.toggleFilePanel();
    }
}
