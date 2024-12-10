/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {fileExtCol, GridModel} from '@xh/hoist/cmp/grid';
import {filler, hbox, li, ul, vbox} from '@xh/hoist/cmp/layout';
import {HoistModel, managed, ReactionSpec, Some, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {pluralize, withDefault} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import filesize from 'filesize';
import {castArray, concat, find, isEmpty, isFunction, map, uniqBy, without} from 'lodash';
import mime from 'mime';
import {ReactElement, ReactNode} from 'react';
import {DropzoneRef, FileRejection} from 'react-dropzone';

export interface FileChooserConf {
    /** File type(s) to accept (e.g. `['.doc', '.docx', '.pdf']`). */
    accept?: Some<string>;

    /** True (default) to allow multiple files in a single upload. */
    enableMulti?: boolean;

    /**
     * True to allow user to drop multiple files into the dropzone at once.  True also allows
     * for selection of multiple files within the OS pop-up window. Defaults to enableMulti.
     */
    enableAddMulti?: boolean;

    /** Maximum number of accepted files accepted in one drop. */
    maxFiles?: number;

    /** Maximum accepted file size in bytes. */
    maxSize?: number;

    /** Minimum accepted file size in bytes. */
    minSize?: number;

    /**
     * True (default) to display the selected file(s) in a grid alongside the dropzone. Note
     * that, if false, the component will not provide any built-in indication of its selection.
     */
    showFileGrid?: boolean;

    /** Content to display within the dropzone target. */
    targetText?: ReactNode | ((draggedCount: number) => ReactNode);

    /**
     * Content to display on file reject within the dropzone target.
     * Defaults to a button that shows an alert with a list of reject files with reasons for
     * rejection.
     */
    rejectText?: ReactNode | ((rejectedFiles: FileRejection[]) => ReactNode);

    /** True to disable clicking on the dropzone to open the file browser. Defaults to false */
    noClick?: boolean;
}

export class FileChooserModel extends HoistModel {
    @observable.ref
    files: File[] = [];

    dropzoneRef = createObservableRef<DropzoneRef>();

    @observable
    targetDisplay: ReactNode;

    @observable
    rejectDisplay: ReactNode;

    @observable
    draggedCount = 0;

    @managed
    gridModel: GridModel;

    accept: Record<string, string[]>;
    enableMulti: boolean;
    enableAddMulti: boolean;
    maxFiles: number;
    maxSize: number;
    minSize: number;
    showFileGrid: boolean;
    noClick: boolean;

    private targetText: ReactNode | ((draggedCount: number) => ReactNode);
    private rejectText: ReactNode | ((rejectedFiles: FileRejection[]) => ReactNode);

    constructor(params: FileChooserConf) {
        super();
        makeObservable(this);

        this.accept = this.getMimesByExt(params.accept);
        this.maxFiles = params.maxFiles;
        this.maxSize = params.maxSize;
        this.minSize = params.minSize;
        this.showFileGrid = params.showFileGrid;
        this.enableMulti = withDefault(params.enableMulti, true);
        this.enableAddMulti = withDefault(params.enableAddMulti, this.enableMulti);
        this.targetText = withDefault(params.targetText, this.defaultTargetText);
        this.rejectText = withDefault(params.rejectText, this.defaultRejectionText);
        this.noClick = withDefault(params.noClick, false);
        this.gridModel = this.createGridModel();

        this.addReaction(this.fileReaction(), this.draggedCountReaction());
    }

    /** Open the file browser. Typically used in a button's onClick callback.*/
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
        this.rejectDisplay = null;
    }

    //------------------------
    // Event Handlers
    //------------------------
    @action
    onDragEnter(event) {
        this.draggedCount = event.dataTransfer.items.length;
    }

    @action
    onDragLeave(event) {
        this.draggedCount = 0;
    }

    @action
    onDrop(accepted: File[], rejected: FileRejection[]) {
        const {enableAddMulti, rejectText} = this;

        this.rejectDisplay = null;
        this.draggedCount = 0;

        if (!isEmpty(accepted)) this.addFiles(enableAddMulti ? accepted : accepted[0]);

        if (rejected.length) {
            this.rejectDisplay = isFunction(rejectText) ? rejectText(rejected) : rejectText;
        }
    }

    //------------------------
    // Implementation
    //------------------------
    private getMimesByExt(extensions: Some<string>): Record<string, string[]> {
        if (isEmpty(extensions)) return null;

        extensions = castArray(extensions);
        let ret = {};
        extensions.forEach(ext => {
            ret[mime.getType(ext)] = [ext];
        });
        return ret;
    }

    private defaultTargetText(draggedCount: number): ReactNode {
        return draggedCount
            ? `Drop to add ${draggedCount} ${pluralize('file', draggedCount)}.`
            : 'Drag and drop files here, or click to browse...';
    }

    private defaultRejectionText(rejections: FileRejection[]): ReactElement {
        // 1) Create map of rejected files to list of error messages
        const errorsByFile = {};
        rejections.forEach(({file, errors}) => {
            const {name} = file.handle;
            errorsByFile[name] = map(errors, 'message');
        });

        // 2) Create list of files with bulleted rejection messages
        const rejectItems = [];
        for (const file in errorsByFile) {
            const errorsMsgs = errorsByFile[file];
            rejectItems.push(
                `${file} rejected for the following ${pluralize('reason', errorsMsgs.length)}:`,
                ul(errorsMsgs.map(it => li(it)))
            );
        }

        return hbox(
            filler(),
            button({
                outlined: true,
                icon: Icon.warning({className: 'xh-red'}),
                text: `${rejections.length} ${pluralize('File', rejections.length)} Rejected`,
                onClick: event => {
                    event.stopPropagation();
                    XH.alert({
                        title: `${rejections.length} ${pluralize('Files', rejections.length)} Rejected`,
                        message: vbox(rejectItems)
                    });
                }
            }),
            filler()
        );
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
        const fileData = files.map(({name, size}) => ({name, size}));
        this.gridModel.loadData(fileData);
    }

    private fileReaction(): ReactionSpec {
        return {
            track: () => this.files,
            run: files => this.loadFileGrid(files)
        };
    }

    private draggedCountReaction(): ReactionSpec {
        return {
            track: () => this.draggedCount,
            run: draggedCount => {
                const {targetText} = this;
                this.targetDisplay = isFunction(targetText) ? targetText(draggedCount) : targetText;
            },
            fireImmediately: true
        };
    }
}
