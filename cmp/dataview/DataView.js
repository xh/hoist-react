/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, HoistComponent, elemFactory} from '@xh/hoist/core';
import {grid} from '@xh/hoist/cmp/grid';
import {GridModel} from '@xh/hoist/cmp/grid';
import {baseCol} from '@xh/hoist/columns/Core';

@HoistComponent({layoutSupport: true})
class DataView extends Component {

    constructor(props) {
        super(props);
        const {store, selModel, contextMenuFn, itemFactory, emptyText} = props.model;
        this._gridModel = new GridModel({
            store,
            selModel,
            contextMenuFn,
            emptyText,
            columns: [
                baseCol({
                    flex: 1,
                    valueGetter: (params) => params.data,
                    elementRenderer: (record) => {
                        return itemFactory({record: record.data});
                    }
                })
            ]
        });
    }

    render() {
        const {layoutConfig, rowCls, itemHeight} = this.props;
        return grid({
            layoutConfig,
            model: this._gridModel,
            agOptions: {
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