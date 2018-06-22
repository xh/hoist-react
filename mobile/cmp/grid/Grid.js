/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {list, listHeader, listItem} from '@xh/hoist/kit/onsen';
import {hframe, frame, div} from '@xh/hoist/cmp/layout';

/**
 * Grid Component
 */
@HoistComponent()
class Grid extends Component {

    render() {
        const {hideHeader, store} = this.model;
        return list({
            cls: `xh-grid ${hideHeader ? 'xh-grid-header-hidden' : ''}`,
            dataSource: store.records,
            renderHeader: () => this.renderHeader(),
            renderRow: (rec) => this.renderRow(rec)
        });
    }

    renderHeader() {
        const {hideHeader, leftColumn, rightColumn} = this.model;
        if (hideHeader) return null;
        return listHeader(
            hframe(
                frame(leftColumn.headerName),
                div(rightColumn.headerName)
            )
        );
    }

    renderRow(rec) {
        const {leftColumn, rightColumn, handler} = this.model;

        return listItem({
            key: rec.id,
            tappable: true,
            modifier: 'longdivider',
            items: [
                div({cls: 'center', item: this.getCellValue(leftColumn, rec)}),
                div({cls: 'right', item: this.getCellValue(rightColumn, rec)})
            ],
            onClick: () => {
                if (handler) handler(rec);
            }
        });
    }

    //------------------------
    // Implementation
    //------------------------
    getCellValue(colDef, rec) {
        const {field, valueFormatter} = colDef,
            v = rec[field];
        return valueFormatter ? valueFormatter(v) : v;
    }

}

export const grid = elemFactory(Grid);