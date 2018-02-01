/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import './LogViewerPanel.css';
import React, {Component} from 'react';
import {XH} from 'hoist';
import {observer, observable, autorun, action, toJS} from 'hoist/mobx';
import {box, vbox, hbox, div} from 'hoist/layout';
import {baseCol} from 'hoist/columns/Core';
import {gridPanel} from 'hoist/ag-grid/GridPanel';
import {button} from 'hoist/kit/semantic';

@observer
export class LogViewerPanel extends Component {
    @observable rows = null;
    @observable direction = 'left';
    @observable collapsed = false;
    @observable tail = true;
    @observable file = null;
    @observable startLine = 1;
    @observable maxLines = 1000;
    @observable pattern = '';
    @observable fileContent = [];

    render() {
        return hbox({
            style: {
                flexBasis: '100%'
            },
            items: [
                box({
                    className: this.collapsed ? 'collapsed' : 'expanded',
                    items: [
                        gridPanel({
                            rows: toJS(this.rows),
                            columns: [
                                baseCol({headerName: 'Log File', field: 'filename', width: 250})
                            ],
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
                    verticalAlign: 'middle',
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
        return XH
            .fetchJson({url: 'logViewerAdmin/listFiles'})
            .then(rows => {
                const files = rows.files;
                // this.preprocessRows(files);
                this.completeLoad(true, files);
            }).catch(e => {
                this.completeLoad(false, e);
                XH.handleException(e);
            });
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
    completeLoad(success, vals) {
        this.rows = success ? vals : [];
    }

    @action
    toggleLogPanel = () => {
        this.direction = this.direction === 'left' ? 'right' : 'left';
        this.collapsed = !this.collapsed;
    }

    preprocessRows(rows) {
        // Maybe return the date only ???
    }
}
