/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import './LogViewer.css';
import {Component} from 'react';
import {observer, observable, toJS, autorun} from 'hoist/mobx';
import {box, vbox, hbox, div} from 'hoist/layout';
import {grid} from 'hoist/grid';
import {Ref} from 'hoist/react';
import {button} from 'hoist/kit/semantic';

import {LogViewerModel} from './LogViewerModel';
import {logViewerToolbar} from './LogViewerToolbar';

@observer
export class LogViewer extends Component {
    model = new LogViewerModel();

    @observable lastRow = new Ref();

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
                    item: grid({
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
                    item: button({
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
                        logViewerToolbar({model: this.model}),
                        this.buildLogDisplay(rows)
                    ]
                })
            ]
        });
    }

    buildLogDisplay(rows) {
        return vbox({
            cls: 'log-display',
            items: toJS(rows).map((row, idx) => {
                return div({
                    cls: 'row',
                    ref: idx === rows.length - 1 ? this.lastRow.callback : undefined,
                    items: [
                        div({key: `row-number-${idx}`,  cls: 'row-number',  item: row[0].toString()}),
                        div({key: `row-content-${idx}`, cls: 'row-content', item: row[1]})
                    ]
                });
            })
        });
    }

    onGridCellClicked = (ctx) => {
        this.model.loadFile(ctx.data.filename);
    }

    onResizerClicked = () => {
        this.model.toggleFilePanel();
    }

    componentDidMount() {
        autorun(() => {
            if (!this.model.tail) return;
            const lastRowElem = this.lastRow.value;
            if (lastRowElem) {
                lastRowElem.scrollIntoView({behavior: 'smooth'});
            }
        });
    }
}