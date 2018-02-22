/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
export class RestContextMenuModel {

    items = null;

    constructor({parent, contextMenuItems}) {
        this.parent = parent;
        this.items = contextMenuItems;
    }

    getContextMenuItems(params) {
        return this.items || this.getDefaultItems(params);
    }

    getDefaultItems(params) {
        const parent = this.parent,
            selection = parent.selection;

        // would be nice to get an icon for each. icon here is an DOM el or an html string. Not sure we're set up for this yet.
        return [
            {
                name: 'Add Record',
                // is there a better way to convert blueprint icons to html a la XH.Glyph.html(glyph)?
                icon: '<svg class="pt-icon" data-icon="add" width="16" height="16" viewBox="0 0 16 16"><title>add</title><path d="M10.99 6.99h-2v-2c0-.55-.45-1-1-1s-1 .45-1 1v2h-2c-.55 0-1 .45-1 1s.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1v-2h2c.55 0 1-.45 1-1s-.45-1-1-1zm-3-7c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.68 6-6 6z" fill-rule="evenodd"></path></svg>',
                action: () => parent.addRecord(),
                tooltip: 'Add record'
            },
            {
                name: 'Edit Record',
                action: () => parent.editSelection(),
                disabled: selection.isEmpty,
                tooltip: 'Edit record'
            },
            {
                name: 'Delete Record',
                action: () => this.onContextDeleteClick(),
                disabled: selection.isEmpty,
                tooltip: 'Delete record'
            },
            'separator',
            {
                name: 'Rest',
                subMenu: [
                    {
                        name: 'Add Record',
                        action: () => parent.addRecord(),
                        tooltip: 'Add record'
                    },
                    {
                        name: 'Edit Record',
                        action: () => parent.editSelection(),
                        disabled: selection.isEmpty,
                        tooltip: 'Edit record'
                    },
                    {
                        name: 'Delete Record',
                        action: () => this.onContextDeleteClick(),
                        disabled: selection.isEmpty,
                        tooltip: 'Delete record'
                    }
                ],
                tooltip: 'Demoing nested menus'
            },
            'separator',
            'export' // default option provided by ag-grid
        ];
    }

    onContextDeleteClick() {
        const warning = this.parent.actionWarning.del;
        if (warning) {
            this.parent.confirmModel.show({
                message: warning,
                onConfirm: () => this.parent.deleteSelection()
            });
        } else {
            this.parent.deleteSelection();
        }
    }

}