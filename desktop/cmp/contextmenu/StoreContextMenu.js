/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isEmpty, isString, flatten, isPlainObject} from 'lodash';
import {RecordAction} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Model for ContextMenus interacting with data provided by Hoist data stores, typically via a Grid.
 * @see GridModel.contextMenuFn
 */
export class StoreContextMenu {

    /** @member {RecordAction[]} */
    items = [];
    /** @member {GridModel} */
    gridModel = null;

    /**
     * @param {Object} c - StoreContextMenu configuration.
     * @param {Object[]} c.items - RecordAction configs or token strings to create.
     *
     *      If a String, value can be '-' for a separator, a Hoist token (below),
     *      or a token supported by ag-Grid for its native menu items.
     *      @see {@link https://www.ag-grid.com/javascript-grid-context-menu/#built-in-menu-items|ag-Grid Docs}
     *
     *      Hoist tokens, all of which require a GridModel:
     *          `colChooser` - display column chooser for a grid.
     *          `expandCollapseAll` - expand/collapse all parent rows on grouped or tree grid.
     *          `export` - export grid data to excel via Hoist's server-side export capabilities.
     *          `exportExcel` - same as above.
     *          `exportCsv` - export grid data to CSV via Hoist's server-side export capabilities.
     *          `exportLocal` - export grid data to Excel via ag-Grid's built-in client side export.
     *
     * @param {GridModel} [c.gridModel] - GridModel to bind to this contextMenu, used to enable
     *      implementation of menu items / tokens above.
     */
    constructor({items, gridModel}) {
        this.gridModel = gridModel;
        this.items = flatten(items.map(it => this.buildRecordAction(it)));
    }

    buildRecordAction(item) {
        if (isString(item)) return this.parseToken(item);

        throwIf(!isPlainObject(item), 'Only strings and RecordAction config objects are supported as context menu items!');

        const ret = new RecordAction(item);
        if (!isEmpty(ret.items)) {
            ret.items = ret.items.map(it => this.buildRecordAction(it));
        }
        return  ret;
    }

    parseToken(token) {
        const gridModel = this.gridModel;

        switch (token) {
            case 'colChooser':
                return new RecordAction({
                    text: 'Columns...',
                    icon: Icon.gridPanel(),
                    hidden: !gridModel || !gridModel.colChooserModel,
                    actionFn: () => gridModel.colChooserModel.open()
                });
            case 'export':
            case 'exportExcel':
                return new RecordAction({
                    text: 'Export to Excel',
                    icon: Icon.download(),
                    hidden: !gridModel || !gridModel.enableExport,
                    disabled: !gridModel || !gridModel.store.count,
                    actionFn: () => gridModel.export({type: 'excelTable'})
                });
            case 'exportCsv':
                return new RecordAction({
                    text: 'Export to CSV',
                    icon: Icon.download(),
                    hidden: !gridModel || !gridModel.enableExport,
                    disabled: !gridModel || !gridModel.store.count,
                    actionFn: () => gridModel.export({type: 'csv'})
                });
            case 'copyCell':
                return new RecordAction({
                    text: 'Copy Cell',
                    icon: Icon.copy(),
                    hidden: !gridModel,
                    disabled: !gridModel,
                    actionFn: () => gridModel.copyCell()
                });
            case 'expandCollapseAll':
                return [
                    new RecordAction({
                        text: 'Expand All',
                        icon: Icon.angleDown(),
                        hidden: !gridModel || (!gridModel.treeMode && isEmpty(gridModel.groupBy)),
                        actionFn: () => gridModel.expandAll()
                    }),
                    new RecordAction({
                        text: 'Collapse All',
                        icon: Icon.angleRight(),
                        hidden: !gridModel || (!gridModel.treeMode && isEmpty(gridModel.groupBy)),
                        actionFn: () => gridModel.collapseAll()
                    })
                ];
            case 'exportLocal':
                return 'export';
            default:
                return token;
        }
    }
}