/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import './LogViewerPanel.css';
import React, {Component} from 'react';
import {XH} from 'hoist';
import {observer, observable, autorun, action} from 'hoist/mobx';
import {box, vbox, hbox, div} from 'hoist/layout';
import {baseCol} from 'hoist/columns/Core';
import {grid, GridModel} from 'hoist/grid';
import {button} from 'hoist/kit/semantic';

@observer
export class LogViewerPanel extends Component {
    @observable direction = 'left';
    @observable collapsed = false;
    @observable tail = true;
    @observable file = null;
    @observable startLine = 1;
    @observable maxLines = 1000;
    @observable pattern = '';
    @observable fileContent = [];

    @observable model = new GridModel({
        url: 'logViewerAdmin/listFiles',
        columns: [
            baseCol({headerName: 'Log File', field: 'filename', width: 250})
        ],
        dataRoot: 'files'
    });

    render() {
        return hbox({
            style: {
                flexBasis: '100%'
            },
            items: [
                box({
                    className: this.collapsed ? 'collapsed' : 'expanded',
                    items: [
                        grid({
                            model: this.model,
                            gridOptions: {
                                onCellClicked: this.loadFile
                            }
                        })
                    ]
                }),
                vbox({
                    width: 10,
                    style: {
                        background: '#959b9e'
                    },
                    verticalalign: 'middle',
                    justifyContent: 'center',
                    alignItems: 'center',
                    items: [
                        button({
                            size: 'small',
                            className: 'resizer',
                            compact: true,
                            icon: {name: `${this.direction} chevron`, color: 'blue'},
                            style: {
                                margin: 0,
                                padding: 0,
                                width: '10px',
                                height: '70px'
                            },
                            onClick: this.toggleLogPanel
                        })
                    ]
                }),
                vbox({
                    flexBasis: '100%',
                    items: [{
                        style: {
                            background: '#106ba3',
                            height: '40px'
                        }
                    },
                    <div className="log-display">
                        {this.fileContent}
                    </div>
                    ]
                })
            ]
        });
    }

    loadAsync() {
        return this.model.loadAsync();
    }

    loadLines = autorun(() => {
        if (!this.file) return;

        return XH
            .fetchJson({
                url: 'logViewerAdmin/getFile',
                params: {
                    filename: this.file,
                    startLine: this.startLine,
                    maxLines: this.maxLines,
                    pattern: this.pattern
                }
            })
            .then(this.updateFileContent).catch(e => {
                XH.handleException(e);
            });
    })

    @action
    loadFile = (ctx) => {
        const data = ctx.data;

        this.file = data.filename;
    }

    @action
    updateFileContent = (rows) => {
        this.fileContent = [];
        const content = rows.content;

        content.forEach(row => {
            this.fileContent.push(
                <div className="line">
                    <div className="row-number">{row[0]}</div>
                    <div className="row-content">{row[1]}</div>
                </div>
            );
        });
    }

    @action
    toggleLogPanel = () => {
        this.direction = this.direction === 'left' ? 'right' : 'left';
        this.collapsed = !this.collapsed;
    }
}
