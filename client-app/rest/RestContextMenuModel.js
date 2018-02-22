

export class RestContextMenuModel {

    items = null;

    constructor(contextMenuItems) {
        this.items = contextMenuItems || this.getDefaultItems();
    }

    getContextMenuItems = () => {
        return this.items;
    }

    getDefaultItems() {
        return [{
            name: 'Add Record',
            // is there a better way to convert blueprint icons to html a la XH.Glyph.html(glyph)?
            icon: '<svg class="pt-icon" data-icon="add" width="16" height="16" viewBox="0 0 16 16"><title>add</title><path d="M10.99 6.99h-2v-2c0-.55-.45-1-1-1s-1 .45-1 1v2h-2c-.55 0-1 .45-1 1s.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1v-2h2c.55 0 1-.45 1-1s-.45-1-1-1zm-3-7c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.68 6-6 6z" fill-rule="evenodd"></path></svg>',
            // action: () => this.addRecord(),
            tooltip: 'Add record'
        }];
    }
    // getContextMenuItems(params) {
    //     // would be nice to get an icon for each. icon here is an DOM el or an html string. Not sure we're set up for this yet.
    //     return [
    //         {
    //             name: 'Add Record',
    //             // is there a better way to convert blueprint icons to html a la XH.Glyph.html(glyph)?
    //             icon: '<svg class="pt-icon" data-icon="add" width="16" height="16" viewBox="0 0 16 16"><title>add</title><path d="M10.99 6.99h-2v-2c0-.55-.45-1-1-1s-1 .45-1 1v2h-2c-.55 0-1 .45-1 1s.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1v-2h2c.55 0 1-.45 1-1s-.45-1-1-1zm-3-7c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.68 6-6 6z" fill-rule="evenodd"></path></svg>',
    //             action: () => this.addRecord(),
    //             tooltip: 'Add record'
    //         },
    //         {
    //             name: 'Edit Record',
    //             action: () => this.editSelection(),
    //             disabled: this.selection.isEmpty,
    //             tooltip: 'Edit record'
    //         },
    //         {
    //             name: 'Delete Record',
    //             action: () => this.onContextDeleteClick(),
    //             disabled: this.selection.isEmpty,
    //             tooltip: 'Delete record'
    //         },
    //         'separator',
    //         {
    //             name: 'Rest',
    //             subMenu: [
    //                 {
    //                     name: 'Add Record',
    //                     action: () => this.addRecord(),
    //                     tooltip: 'Add record'
    //                 },
    //                 {
    //                     name: 'Edit Record',
    //                     action: () => this.editSelection(),
    //                     disabled: this.selection.isEmpty,
    //                     tooltip: 'Edit record'
    //                 },
    //                 {
    //                     name: 'Delete Record',
    //                     action: () => this.onContextDeleteClick(),
    //                     disabled: this.selection.isEmpty,
    //                     tooltip: 'Delete record'
    //                 }
    //             ],
    //             tooltip: 'Demoing nested menus'
    //         },
    //         'separator',
    //         'export' // default option provided by ag-grid
    //     ];
    // }
    //
    // // this (should) mirrors the delete button in the toolbar, which reaches into this model. How can we dry or make symmetrical?
    // onContextDeleteClick = () => {
    //     const warning = this.actionWarning.del;
    //     if (warning) {
    //         this.confirmModel.show({
    //             message: warning,
    //             onConfirm: () => this.deleteSelection()
    //         });
    //     } else {
    //         this.deleteSelection();
    //     }
    // }

}