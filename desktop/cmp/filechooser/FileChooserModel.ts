/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {fileExtCol, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, Some} from '@xh/hoist/core';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {isArray, isEmpty} from 'lodash';
import filesize from 'filesize';
import {find, uniqBy, without} from 'lodash';
import {FileRejection} from 'react-dropzone';
import {ReactNode} from 'react';
import {code, fragment, p} from '@xh/hoist/cmp/layout';

export interface FileChooserConfig {
    /** File type(s) to accept (e.g. `['.doc', '.docx', '.pdf']`). */
    accept?: Some<string>;

    /** True (default) to allow multiple files in a single upload. */
    enableMulti?: boolean;

    /**
     * True to allow user to drop multiple files into the dropzone at once.  True also allows
     * for selection of multiple files within the OS pop-up window.  Defaults to enableMulti.
     */
    enableAddMulti?: boolean;

    /** Maximum accepted file size in bytes. */
    maxSize?: number;

    /** Minimum accepted file size in bytes. */
    minSize?: number;

    /**
     * True (default) to display the selected file(s) in a grid alongside the dropzone. Note
     * that, if false, the component will not provide any built-in indication of its selection.
     */
    showFileGrid?: boolean;

    /** Intro/help text to display within the dropzone target. */
    targetDisplay?: ReactNode | ((model: FileChooserModel) => ReactNode);

    /** Text to display within the dropzone target when files are rejected. */
    rejectDisplay?: ReactNode | ((model: FileChooserModel) => ReactNode);
}

export class FileChooserModel extends HoistModel {
    //-------------------------
    // Immutable Configuration
    //------------------------
    @bindable accept: Some<string>;
    @bindable maxSize: number;
    @bindable minSize: number;
    @bindable enableMulti: boolean;
    @bindable enableAddMulti: boolean;
    @bindable showFileGrid: boolean;
    @bindable targetDisplay: ReactNode | ((model: FileChooserModel) => ReactNode);
    @bindable rejectDisplay: ReactNode | ((model: FileChooserModel) => ReactNode);

    //---------------
    // Runtime state
    //---------------
    @observable.ref
    files: File[] = [];
    @observable.ref
    lastAccepted: File[] = [];
    @observable.ref
    lastRejected: FileRejection[] = [];

    @managed
    gridModel: GridModel;

    constructor(config: FileChooserConfig) {
        super();
        makeObservable(this);

        this.accept = config.accept;
        this.maxSize = config.maxSize ?? 10000000;
        this.minSize = config.minSize ?? 0;
        this.enableMulti = config.enableMulti ?? true;
        this.enableAddMulti = config.enableAddMulti ?? this.enableMulti;
        this.showFileGrid = config.showFileGrid ?? true;
        this.targetDisplay = config.targetDisplay ?? this.defaultTargetDisplay;
        this.rejectDisplay = config.rejectDisplay ?? this.defaultRejectDisplay;

        this.gridModel = this.createGridModel();

        this.addReaction({
            track: () => this.files,
            run: files => this.onFilesChange(files)
        });
    }

    /**
     * Add Files to the selection. Typically called by the component's embedded react-dropzone.
     * Files will be de-duplicated by name, with a newly added file taking precedence over any
     * existing file with the same name.
     */
    @action
    addFiles(filesToAdd: File[]) {
        this.files = uniqBy([...filesToAdd, ...this.files], 'name');
    }

    @action
    setSingleFile(file: File) {
        this.files = [file];
    }

    /**
     * Remove a single file from the current selection.
     */
    @action
    removeFileByName(name: string) {
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
    private createGridModel(): GridModel {
        return new GridModel({
            hideHeaders: true,
            store: {
                idSpec: 'name',
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'size', type: 'number'}
                ]
            },
            columns: [
                {
                    colId: 'icon',
                    field: 'name',
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
                    actions: [
                        {
                            icon: Icon.delete(),
                            tooltip: 'Remove file',
                            intent: 'danger',
                            actionFn: ({record}) => {
                                this.removeFileByName(record.data.name);
                            }
                        }
                    ]
                }
            ],
            emptyText: 'No files selected.',
            xhImpl: true
        });
    }

    @action
    onDrop(accepted: File[], rejected: FileRejection[]) {
        if (accepted?.length > 1 && !this.enableMulti) {
            accepted = [accepted[0]];
        }
        this.lastAccepted = accepted;
        this.lastRejected = rejected;
        this.addFiles(accepted);
    }

    onFilesChange(files: File[]) {
        const fileData = files.map(file => ({name: file.name, size: file.size}));
        this.gridModel.loadData(fileData);
    }

    //----------------
    // Implementation
    //----------------
    private defaultTargetDisplay = () => {
        return fragment(
            p('Drag and drop your files here, or click to browse.'),
            p({
                items: [
                    'Note that this example is configured to accept only ',
                    code(
                        isArray(this.accept)
                            ? this.accept.map(type => '*' + type).join(' and ')
                            : this.accept
                    ),
                    ' file types.'
                ]
            })
        );
    };

    private defaultRejectDisplay = () => {
        if (isEmpty(this.lastRejected)) return null;
        console.log('File rejections:', this.lastRejected);
        const failedFiles = this.lastRejected.map(rejection => rejection.file.name).join(', ');
        return p({
            style: {overflow: 'hidden', textOverflow: 'ellipsis'},
            item: `${this.lastRejected.length} files failed to upload: ${failedFiles}.`
        });
    };
}
