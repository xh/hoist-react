/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {fileExtCol, GridModel} from '@xh/hoist/cmp/grid';
import {li, ul, vbox} from '@xh/hoist/cmp/layout';
import {HoistModel, managed, ReactionSpec, Some, XH} from '@xh/hoist/core';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {pluralize, withDefault} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import filesize from 'filesize';
import {castArray, concat, find, isEmpty, isFunction, map, uniqBy, without, take} from 'lodash';
import mime from 'mime';
import {ReactElement, ReactNode} from 'react';
import {DropzoneRef, FileRejection} from 'react-dropzone';

export interface FileChooserConf {
    /** File type(s) to accept (e.g. `['.doc', '.docx', '.pdf']`). */
    accept?: Some<string>;

    /** True to allow user to drop multiple files into the dropzone at once. */
    enableAddMulti?: boolean;

    /** Maximum number of overall files that can be added. */
    maxFiles?: number;

    /** Maximum accepted file size in bytes. */
    maxSize?: number;

    /** Minimum accepted file size in bytes. */
    minSize?: number;

    /** Content to display within the dropzone target when no files are uploaded. */
    emptyDisplay?: ReactNode | (() => ReactNode);

    /**
     * Content to display on file reject within a danger toast.
     * Defaults a list of rejected files with reasons for rejection.
     */
    rejectMessage?: ReactNode | ((rejectedFiles: FileRejection[]) => ReactNode);

    /** True to disable clicking on the dropzone to open the file browser. Defaults to true */
    noClick?: boolean;
}

export class FileChooserModel extends HoistModel {
    @observable.ref
    files: File[] = [];

    @observable
    emptyDisplay: ReactNode | (() => ReactNode);

    @observable
    rejectMessage: ReactNode | ((rejectedFiles: FileRejection[]) => ReactNode);

    @managed
    gridModel: GridModel;

    accept: Record<string, string[]>;
    enableMulti: boolean;
    acceptMulti: boolean;
    maxFiles: number;
    maxAdd: number;
    maxSize: number;
    minSize: number;
    noClick: boolean;

    dropzoneRef = createObservableRef<DropzoneRef>();

    constructor(params: FileChooserConf) {
        super();
        makeObservable(this);

        this.gridModel = this.createGridModel();

        this.maxFiles = params.maxFiles;
        this.maxSize = params.maxSize;
        this.minSize = params.minSize;
        this.accept = this.getMimesByExt(params.accept);
        this.acceptMulti = withDefault(params.enableAddMulti, true);
        this.rejectMessage = withDefault(params.rejectMessage, this.defaultRejectionMessage);
        this.emptyDisplay = params.emptyDisplay;
        this.noClick = withDefault(params.noClick, true);

        this.addReaction(this.fileReaction());
    }

    /** Open the file browser programmatically. Typically used in a button's onClick callback.*/
    openFileBrowser() {
        this.dropzoneRef.current?.open();
    }

    /**
     * Add Files to the selection. Typically called by the component's embedded react-dropzone.
     * Files will be de-duplicated by name, with a newly added file taking precedence over any
     * existing file with the same name.
     */
    @action
    addFiles(filesToAdd: Some<File>) {
        this.files = uniqBy(concat(filesToAdd, this.files), 'name');
    }

    /** Remove a single file from the current selection. */
    @action
    removeFileByName(name: string) {
        const toRemove = find(this.files, {name});
        if (toRemove) this.files = without(this.files, toRemove);
    }

    /** Clear the current selection. */
    @action
    clear() {
        this.files = [];
    }

    //------------------------
    // Event Handlers
    //------------------------
    @action
    onDrop(accepted: File[], rejected: FileRejection[]) {
        const {files, maxFiles, maxAdd, acceptMulti, rejectMessage} = this,
            currFileCount = files.length,
            acceptCount = accepted.length,
            rejectCount = rejected.length;

        if (currFileCount + acceptCount > maxFiles) {
            XH.warningToast(
                `${maxFiles} file limit exceeded. ${maxFiles - acceptCount} additional files may be added`
            );
            return;
        }

        if (acceptCount) {
            if (!acceptMulti) {
                if (acceptCount > 1) {
                    const droppedCount = acceptCount - 1;
                    XH.warningToast(
                        `Multi file adding disabled. ${droppedCount} ${pluralize('file', droppedCount)} not added.`
                    );
                }
                this.addFiles(accepted[0]);
            } else if (acceptCount > maxAdd) {
                const droppedCount = acceptCount - maxAdd;
                XH.warningToast(
                    `Max ${maxAdd} files per add. ${droppedCount} ${pluralize('file', droppedCount)} not added.`
                );
                this.addFiles(take(accepted, maxAdd));
            } else {
                this.addFiles(accepted);
            }
        }

        if (rejectCount) {
            const message = isFunction(rejectMessage) ? rejectMessage(rejected) : rejectMessage;
            XH.toast({intent: 'danger', message});
        }
    }

    //------------------------
    // Implementation
    //------------------------
    private getMimesByExt(extensions: Some<string>): Record<string, string[]> {
        if (isEmpty(extensions)) return null;

        extensions = castArray(extensions);
        let ret = {};
        extensions.forEach(ext => (ret[mime.getType(ext)] = [ext]));
        return ret;
    }

    private defaultRejectionMessage(rejections: FileRejection[]): ReactElement {
        // 1) Map rejected files to error messages
        const errorsByFile = {};
        rejections.forEach(({file, errors}) => {
            const {name} = file.handle;
            errorsByFile[name] = map(errors, 'message');
        });

        // 2) List files with bulleted error messages
        const files = Object.keys(errorsByFile),
            rejectItems = files.flatMap(file => {
                const messages = errorsByFile[file];
                return [
                    `${file} rejected for the following ${pluralize('reason', messages.length)}:`,
                    ul(messages.map(it => li(it)))
                ];
            });

        return vbox(rejectItems);
    }

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

    private loadFileGrid(files: File[]) {
        this.gridModel.loadData(files);
    }

    private fileReaction(): ReactionSpec {
        return {
            track: () => this.files,
            run: files => this.loadFileGrid(files)
        };
    }
}
