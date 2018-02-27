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
import {contextMenu, ContextMenuTarget, ContextMenuModel} from 'hoist/cmp/contextmenu';

@hoistComponent()
@ContextMenuTarget
class LogViewerDisplay extends Component {

    contextMenuModel = this.createContextMenuModel();
    localModel = this.props.model;
    lastRow = new Ref();
    currentRow = 0;

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
                onMouseOver: () => {
                    this.currentRow = idx;
                },
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
        return contextMenu({style: {width: '200px'}, model: this.contextMenuModel});
    }

    createContextMenuModel() {
        return new ContextMenuModel([
            clipboardMenuItem({
                buttonProps: {
                    text: 'Copy log to clipboard.'
                },
                successMessage: 'Log copied to the clipboard.',
                text: () => this.model.rows.map(row => row.join(': ')).join('\n')
            }),
            clipboardMenuItem({
                buttonProps: {
                    text: `Copy current line to clipboard.`,
                    icon: 'list'
                },
                successMessage: 'Log line copied to the clipboard.',
                text: () => this.model.rows[this.currentRow].join(': ')
            }),

        ]);
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