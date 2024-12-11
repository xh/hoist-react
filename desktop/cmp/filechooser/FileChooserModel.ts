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

    /** Maximum number of accepted files accepted in one drop. */
    maxAdd?: number;

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

    @observable
    targetDisplay: ReactNode;

    @observable
    rejectDisplay: ReactNode;

    @observable
    draggedCount = 0;

    dropzoneRef = createObservableRef<DropzoneRef>();

    @managed
    gridModel: GridModel;

    accept: Record<string, string[]>;
    enableMulti: boolean;
    acceptMulti: boolean;
    maxFiles: number;
    maxAdd: number;
    maxSize: number;
    minSize: number;
    showFileGrid: boolean;
    noClick: boolean;

    private targetText: ReactNode | ((draggedCount: number) => ReactNode);
    private rejectText: ReactNode | ((rejectedFiles: FileRejection[]) => ReactNode);

    constructor(params: FileChooserConf) {
        super();
        makeObservable(this);

        this.gridModel = this.createGridModel();

        this.maxFiles = params.maxFiles;
        this.maxAdd = params.maxAdd;
        this.maxSize = params.maxSize;
        this.minSize = params.minSize;
        this.showFileGrid = params.showFileGrid;
        this.accept = this.getMimesByExt(params.accept);
        this.acceptMulti = withDefault(params.enableAddMulti, true);
        this.targetText = withDefault(params.targetText, this.defaultTargetText);
        this.rejectText = withDefault(params.rejectText, this.defaultRejectionText);
        this.noClick = withDefault(params.noClick, false);

        this.addReaction(this.fileReaction(), this.draggedCountReaction());
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
        this.rejectDisplay = null;
        this.draggedCount = 0;

        const {files, maxFiles, maxAdd, acceptMulti, rejectText} = this,
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
        extensions.forEach(ext => (ret[mime.getType(ext)] = [ext]));
        return ret;
    }

    private defaultTargetText(draggedCount: number): ReactNode {
        return draggedCount
            ? `Drop to add ${draggedCount} ${pluralize('file', draggedCount)}.`
            : 'Drag and drop files here, or click to browse...';
    }

    private defaultRejectionText(rejections: FileRejection[]): ReactElement {
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
        this.gridModel.loadData(files);
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
