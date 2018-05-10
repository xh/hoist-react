/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {list, listHeader, listItem} from 'hoist/kit/onsen';
import {hframe, frame, div, span} from 'hoist/layout';

/**
 * Grid Component
 */
@hoistComponent()
class Grid extends Component {

    render() {
        return list({
            cls: 'xh-grid',
            dataSource: this.model.store.records,
            renderHeader: () => this.renderHeader(),
            renderRow: (rec) => this.renderRow(rec)
        });
    }

    renderHeader() {
        const {leftColumn, rightColumn} = this.model;
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
        return valueFormatter ? this.getFormattedValue(v, valueFormatter) : v;
    }

    getFormattedValue(v, formatter) {
        // Todo: This is temporary until we have a proper solution in place for formatters returning els
        return span({dangerouslySetInnerHTML: {__html: formatter(v)}});
    }

}

export const grid = elemFactory(Grid);