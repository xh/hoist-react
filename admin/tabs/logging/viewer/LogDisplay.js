/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {frame, table, tbody, td, tr} from '@xh/hoist/cmp/layout';
import {clipboardMenuItem} from '@xh/hoist/desktop/cmp/clipboard';
import {ContextMenuSupport} from '@xh/hoist/desktop/cmp/contextmenu';
import {loadingIndicator} from '@xh/hoist/desktop/cmp/loadingindicator';

/**
 * @private
 */
@HoistComponent
@ContextMenuSupport
export class LogDisplay extends Component {

    render() {
        const {rows, loadModel} = this.model;
        return panel({
            item: frame({
                className: 'xh-log-display',
                overflow: 'scroll',
                items: table(tbody(...this.renderTableRows(rows)))
            }),
            loadingIndicator: loadingIndicator({
                model: loadModel,
                message: 'Loading...',
                spinner: false
            })
        });
    }

    renderTableRows(rows) {
        return rows.map((row, idx) => {
            return tr({
                className: 'xh-log-display__row',
                ref: this.model.getRowRef(idx, rows.length),
                items: [
                    td({key: `row-number-${idx}`, datakey: idx, className: 'xh-log-display__row-number', item: row[0].toString()}),
                    td({key: `row-content-${idx}`, datakey: idx, className: 'xh-log-display__row-content', item: row[1]})
                ]
            });
        });
    }

    getContextMenuItems(e) {
        const {rows} = this.model,
            currentRow = e.target.getAttribute('datakey');

        return [
            clipboardMenuItem({
                text: 'Copy Current Line',
                icon: Icon.list(),
                disabled: (currentRow == null),
                successMessage: 'Log line copied to the clipboard.',
                getCopyText: () => rows[currentRow].join(': ')
            }),
            clipboardMenuItem({
                text: 'Copy All Lines',
                successMessage: 'Log lines copied to the clipboard.',
                getCopyText: () => rows.map(row => row.join(': ')).join('\n')
            })
        ];
    }
}
export const logDisplay = elemFactory(LogDisplay);
