/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, HoistComponent, elemFactory} from 'hoist/core';
import {grid} from 'hoist/grid';
import {GridModel} from 'hoist/grid';
import {baseCol} from 'hoist/columns/Core';

@HoistComponent()
class DataView extends Component {

    constructor(props) {
        super(props);
        const {store, selection, contextMenuFn, itemFactory} = props.model;
        this._gridModel = new GridModel({
            store,
            selection,
            contextMenuFn,
            columns: [
                baseCol({
                    field: 'id',
                    flex: 1,
                    elementRenderer: (record) => {
                        return itemFactory({record: record.data});
                    }
                })
            ]
        });
    }

    render() {
        const {rowCls, itemHeight} = this.props;
        return grid({
            model: this._gridModel,
            gridOptions: {
                headerHeight: 0,
                rowClass: rowCls,
                rowHeight: itemHeight
            }
        });
    }

    destroy() {
        XH.safeDestroy(this._gridModel);
    }
}

export const dataView = elemFactory(DataView);