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
import {clipboardMenuItem} from '@xh/hoist/desktop/cmp/clipboard';
import {ContextMenuSupport} from '@xh/hoist/desktop/cmp/contextmenu';
import {SECONDS} from '@xh/hoist/utils/DateTimeUtils';
import {Timer} from '@xh/hoist/utils/Timer';

/**
 * @private
 */
@HoistComponent()
@ContextMenuSupport
class LogViewerDisplay extends Component {

    firstRow = new Ref();
    lastRow = new Ref();
    timer = null;

    constructor(props) {
        super(props);
        this.addAutorun(this.syncTail);
        this.timer = Timer.create({
            runFn: () => this.timedRefreshLines(),
            delay: 5 * SECONDS,
            interval: 5 * SECONDS
        });
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

    timedRefreshLines() {
        const {model} = this;
        if (model.tail && this.isDisplayed) {
            const {lastRow} = this,
                rect = lastRow.value && lastRow.value.getBoundingClientRect(),
                inView = rect && rect.bottom <= window.innerHeight;
            if (inView) {
                model.fetchFile();
            }
        }
    }

    getContextMenuItems(e) {
        const rows = this.model.rows,
            currentRow = e.target.getAttribute('datakey');

        return [
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
        ];
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
