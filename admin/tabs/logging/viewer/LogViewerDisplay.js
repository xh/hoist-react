/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {Ref} from '@xh/hoist/utils/Ref';
import {frame, table, tbody, td, tr} from '@xh/hoist/cmp/layout';
import {clipboardMenuItem} from '@xh/hoist/cmp/clipboard';
import {contextMenu} from '@xh/hoist/cmp/contextmenu';

@HoistComponent()
class LogViewerDisplay extends Component {

    firstRow = new Ref();
    lastRow = new Ref();

    constructor(props) {
        super(props);
        this.addAutorun(this.syncTail);
        this.model.lastRow = this.lastRow;
    }

    render() {
        const {rows} = this.model;
        return frame({
            cls: 'xh-log-display',
            overflow: 'scroll',
            item: table(
                tbody(...this.getTableRows(rows))
            )
        });
    }

    getTableRows(rows) {
        return rows.map((row, idx) => {
            return tr({
                cls: 'xh-log-display__row',
                ref: this.getRowRef(idx, rows.length),
                items: [
                    td({key: `row-number-${idx}`, datakey: idx, cls: 'xh-log-display__row-number', item: row[0].toString()}),
                    td({key: `row-content-${idx}`, datakey: idx, cls: 'xh-log-display__row-content', item: row[1]})
                ]
            });
        });
    }

    renderContextMenu(e) {
        const rows = this.model.rows,
            currentRow = e.target.getAttribute('datakey');

        return contextMenu({
            style: {width: '200px'},
            menuItems: [
                clipboardMenuItem({
                    text: 'Copy Current Line',
                    icon: Icon.list(),
                    disabled: (currentRow == null),
                    successMessage: 'Log line copied to the clipboard.',
                    clipboardSpec: {text: () => rows[currentRow].join(': ')}
                }),
                clipboardMenuItem({
                    text: 'Copy All Lines',
                    successMessage: 'Log lines copied to the clipboard.',
                    clipboardSpec: {text: () => rows.map(row => row.join(': ')).join('\n')}
                })
            ]
        });
    }

    getRowRef(idx, total) {
        if (idx === total - 1) {
            return this.lastRow.ref;
        } else if (idx === 0) {
            return this.firstRow.ref;
        }

        return undefined;
    }

    syncTail() {
        const {tail} = this.model,
            rowElem = this[tail ? 'lastRow' : 'firstRow'].value;

        if (rowElem) rowElem.scrollIntoView();
    }
}
export const logViewerDisplay = elemFactory(LogViewerDisplay);