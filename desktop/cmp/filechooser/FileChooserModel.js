/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {LocalStore} from '@xh/hoist/data';
import {action, bindable, observable} from '@xh/hoist/mobx';
import {fileExtCol, GridModel} from '@xh/hoist/cmp/grid';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {find, last, without, uniqBy} from 'lodash';
import filesize from 'filesize';


@HoistModel
export class FileChooserModel {

    @observable.ref
    files = [];

    @bindable
    lastRejectedCount;

    gridModel = new GridModel({
        store: new LocalStore({
            fields: ['name', 'extension', 'size'],
            idSpec: 'name'
        }),
        columns: [
            {
                field: 'extension',
                ...fileExtCol
            },
            {field: 'name', flex: 1},
            {
                field: 'size',
                width: 90,
                align: 'right',
                renderer: v => filesize(v)
            },
            {
                ...actionCol,
                width: calcActionColWidth(1),
                actions: [{
                    icon: Icon.delete(),
                    tooltip: 'Remove file',
                    intent: 'danger',
                    actionFn: ({record}) => {
                        this.removeFileByName(record.name);
                    }
                }]
            }
        ],
        emptyText: 'No files selected'
    });

    constructor() {
        this.addReaction({
            track: () => this.files,
            run: (files) => this.onFilesChange(files)
        });
    }

    /**
     * Add Files to the selection. Typically called by the component's embedded react-dropzone.
     * Files will be de-duplicated by name, with a newly added file taking precedence over any
     * existing file with the same name.
     *
     * @param {File[]} filesToAdd
     */
    @action
    addFiles(filesToAdd) {
        this.files = uniqBy([
            ...filesToAdd,
            ...this.files
        ], 'name');
    }

    /**
     * Remove a single file from the current selection.
     * @param {String} name - name of the file to remove.
     */
    @action
    removeFileByName(name) {
        const toRemove = find(this.files, {name});
        if (toRemove) this.files = without(this.files, toRemove);
    }

    /** Clear the current selection. */
    @action
    removeAllFiles() {
        this.files = [];
    }


    //------------------------
    // Implementation
    //------------------------
    onDrop(accepted, rejected) {
        if (accepted.length) {
            this.addFiles(accepted);
        }

        this.setLastRejectedCount(rejected.length);
    }

    onFilesChange(files) {
        const fileData = files.map(file => {
            const name = file.name,
                extension = name.includes('.') ? last(name.split('.')) : null;

            return {
                id: name,
                name,
                extension,
                size: file.size
            };
        });

        this.gridModel.loadData(fileData);
    }

}
