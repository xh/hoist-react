/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory, hoistComponent} from 'hoist/core';
import {Ref} from 'hoist/utils/Ref';
import {observer, observable, setter , toJS, autorun} from 'hoist/mobx';
import {frame, table, tbody, td, tr} from 'hoist/layout';
import {clipboardMenuItem} from  'hoist/cmp'
import {contextMenu, ContextMenuModel} from 'hoist/cmp/contextmenu';

@hoistComponent()
class LogViewerDisplay extends Component {

    lastRow = new Ref();
    currentRow = null;

    render() {
        const {rows} = this.model;
        return frame({
            overflow: 'scroll',
            item: table(
                tbody(...this.getTableRows(rows))
            )
        })
    }

    getTableRows(rows) {
        return toJS(rows).map((row, idx) => {
            return tr({
                onMouseOver: () => {this.currentRow = idx},
                onMouseOut: () => {this.currentRow = null},
                cls: 'logviewer-row noselect',
                ref: idx === rows.length - 1 ? this.lastRow.ref : undefined,
                items: [
                    td({key: `row-number-${idx}`, cls: 'logviewer-row-number', item: row[0].toString()}),
                    td({key: `row-content-${idx}`, cls: 'logviewer-row-content', item: row[1]})
                ]
            });
        });
    }

    renderContextMenu() {
        const rows = this.model.rows,
            currentRow = this.currentRow;

        const menuModel = new ContextMenuModel([
            clipboardMenuItem({
                text: 'Copy Entire Log',
                successMessage: 'Log copied to the clipboard.',
                targetText: () => rows.map(row => row.join(': ')).join('\n')
            }),
            clipboardMenuItem({
                text: `Copy Current Line`,
                icon: 'list',
                disabled: (currentRow == null),
                successMessage: 'Log line copied to the clipboard.',
                clipboardSpec: {text: () => rows[currentRow].join(': ')}
            }),
        ]);
        return contextMenu({style: {width: '200px'}, model: menuModel});
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

export const logViewerDisplay = elemFactory(LogViewerDisplay);