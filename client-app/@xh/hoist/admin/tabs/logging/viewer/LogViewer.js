/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {toJS, autorun} from 'hoist/mobx';
import {hframe, frame, vframe, table, tbody, td, tr} from 'hoist/layout';
import {grid} from 'hoist/grid';
import {Ref} from 'hoist/utils/Ref';
import {collapsible, loadMask} from 'hoist/cmp';

import {LogViewerModel} from './LogViewerModel';
import {logViewerToolbar} from './LogViewerToolbar';
import './LogViewer.css';

@hoistComponent()
export class LogViewer extends Component {
    localModel = new LogViewerModel();

    lastRow = new Ref();

    loadAsync() {
        return this.model.loadAsync();
    }

    render() {
        return frame(
            this.getContents()
        );
    }

    getContents() {
        const {files, rows, loadModel} = this.model;
        return hframe(
            collapsible({
                side: 'left',
                contentSize: '250px',
                item: grid({
                    model: files,
                    gridOptions: {
                        defaultColDef: {suppressMenu: true}
                    }
                })
            }),
            vframe({
                style: {border: '1px solid darkgrey'},
                items: [
                    logViewerToolbar({model: this.model}),
                    this.buildLogDisplay(rows)
                ]
            }),
            loadMask({model: loadModel})
        );
    }

    buildLogDisplay(rows) {
        return frame({
            overflow: 'scroll',
            item: table(
                tbody(...this.getTableRows(rows))
            )
        });
    }


    getTableRows(rows) {
        return toJS(rows).map((row, idx) => {
            return tr({
                cls: 'logviewer-row',
                ref: idx === rows.length - 1 ? this.lastRow.ref : undefined,
                items: [
                    td({key: `row-number-${idx}`, cls: 'logviewer-row-number', item: row[0].toString()}),
                    td({key: `row-content-${idx}`, cls: 'logviewer-row-content', item: row[1]})
                ]
            });
        });
    }

    componentDidMount() {
        this.disposeTailRunner = autorun(() => {
            if (!this.model.tail) return;
            const lastRowElem = this.lastRow.value;
            if (lastRowElem) {
                lastRowElem.scrollIntoView();
            }
        });
    }

    componenentWillUnmount() {
        this.disposeTailRunner();
    }
}