/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isString} from 'lodash';
import {StoreContextMenuItem} from './StoreContextMenuItem';
import {Icon} from '@xh/hoist/icon';

/**
 * Model for ContextMenus interacting with data provided by Hoist data stores, typically via a Grid.
 * @see GridModel.contextMenuFn
 */
export class StoreContextMenu {

    items = [];
    gridModel = null;

    /**
     * @param {Object} c - StoreContextMenu configuration.
     * @param {Object[]} c.items - StoreContextMenuItems or configs / strings to create.
     *
     *      If a String, value can be '-' for a separator, a Hoist token (below),
     *      or a token supported by ag-Grid for its native menu items.
     *      @see {@link https://www.ag-grid.com/javascript-grid-context-menu/#built-in-menu-items|ag-Grid Docs}
     *
     *      Hoist tokens, all of which require a GridModel:
     *          `colChooser` - display column chooser for a grid.
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
        this.items = items.map(it => {
            if (isString(it)) return this.parseToken(it);
            if (it instanceof StoreContextMenuItem) return it;
            return new StoreContextMenuItem(it);
        });
    }

    parseToken(token) {
        const gridModel = this.gridModel;

        switch (token) {
            case 'colChooser':
                return new StoreContextMenuItem({
                    text: 'Columns...',
                    icon: Icon.grid(),
                    hidden: !gridModel || !gridModel.colChooserModel,
                    action: () => {
                        gridModel.colChooserModel.open();
                    }
                });
            case 'export':
            case 'exportExcel':
                return new StoreContextMenuItem({
                    text: 'Export to Excel',
                    icon: Icon.download(),
                    hidden: !gridModel || !gridModel.enableExport,
                    disabled: !gridModel || !gridModel.store.count,
                    action: () => {
                        gridModel.export({type: 'excelTable'});
                    }
                });
            case 'exportCsv':
                return new StoreContextMenuItem({
                    text: 'Export to CSV',
                    icon: Icon.download(),
                    hidden: !gridModel || !gridModel.enableExport,
                    disabled: !gridModel || !gridModel.store.count,
                    action: () => {
                        gridModel.export({type: 'csv'});
                    }
                });
            case 'exportLocal':
                return 'export';
            default:
                return token;
        }
    }
}