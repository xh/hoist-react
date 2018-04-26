/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {GridModel} from 'hoist/grid';
import {baseCol} from 'hoist/columns/Core';

/**
 * DataViewModel is a wrapper around GridModel, which shows data in a single
 * column, using a defined component for rendering each item.
 */
export class DataViewModel {

    // Immutable public properties
    gridModel = null;

    get selection() {
        return this.gridModel.selection;
    }

    /**
     * @param {function} itemFactory - elemFactory for the component used to render each item.
     *                                  Will receive record via its props.
     * @param {BaseStore} store - store containing the data for the dataview.
     * @param {function} contextMenuFn - closure returning a GridContextMenu().
     */
    constructor({
        itemFactory,
        store,
        contextMenuFn = GridModel.defaultContextMenu
    }) {
        this.gridModel = new GridModel({
            store,
            contextMenuFn,
            columns: [
                baseCol({
                    field: 'id',
                    flex: 1,
                    cellRendererFramework: (
                        class extends Component {
                            render() {
                                return itemFactory({record: this.props.data});
                            }
                        }
                    )
                })
            ]
        });
    }
}