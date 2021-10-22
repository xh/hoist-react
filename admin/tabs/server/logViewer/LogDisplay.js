/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {table, tbody, td, tr, div} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {clipboardMenuItem} from '@xh/hoist/desktop/cmp/clipboard';
import {loadingIndicator} from '@xh/hoist/desktop/cmp/loadingindicator';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {LogDisplayModel} from './LogDisplayModel';

/**
 * @private
 */
export const logDisplay = hoistCmp.factory({
    model: uses(LogDisplayModel),

    render({model}) {

        const contextMenu = (e) => {
            const {rows} = model,
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
        };

        return panel({
            contextMenu,
            item: div({
                className: 'xh-log-display',
                items: tableRows()
            }),
            loadingIndicator: loadingIndicator({
                bind: model.loadModel,
                message: 'Loading...',
                spinner: false
            })
        });
    }
});


const tableRows = hoistCmp.factory(
    ({model}) => {
        const {rows} = model;
        return table(tbody(
            model.rows.map((row, idx) => {
                return tr({
                    className: 'xh-log-display__row',
                    ref: model.getRowRef(idx, rows.length),
                    items: [
                        td({
                            key: `row-number-${idx}`,
                            datakey: idx,
                            className: 'xh-log-display__row-number',
                            item: row[0].toString()
                        }),
                        td({
                            key: `row-content-${idx}`,
                            datakey: idx,
                            className: 'xh-log-display__row-content',
                            item: row[1]
                        })
                    ]
                });
            })
        ));
    }
);
