/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {em, li, span, ul, vbox} from '@xh/hoist/cmp/layout';
import {HoistModel, Some, ToastSpec, XH} from '@xh/hoist/core';
import {ButtonProps} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {pluralize, withDefault} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {castArray, concat, filter, isEmpty, keys, fromPairs, map, uniqBy, isFunction} from 'lodash';
import mime from 'mime';
import {ReactElement, ReactNode} from 'react';
import {DropzoneRef, FileRejection} from 'react-dropzone';

export interface FileChooserConf {
    /** File type(s) to accept (e.g. `['.doc', '.docx', '.pdf']`). */
    accept?: Some<string>;

    /** Maximum number of overall files that can be added. Defaults to null (no limit). */
    maxCount?: number;

    /** Maximum accepted file size in bytes. Defaults to null (no limit). */
    maxFileSize?: number;

    /** Minimum accepted file size in bytes. Defaults to null (no limit). */
    minFileSize?: number;

    /**
     * Callback executed on drop event. Used for additional file validation outside of file type
     * and size prior to updating the model's file state.
     */
    validateFilesAsync?: (accepted: File[]) => Promise<File[]>;

    /** Callback executed on drop event, invoked when files are accepted. */
    onFileAccepted?: (accepted: File[]) => void;

    /** Callback executed on drop event, invoked when files are rejected. */
    onFileRejected?: (rejected: FileRejection[]) => void;

    /**
     * Config for file rejection toast. Primarily used to change timeout, intent, and icon. Toast
     * message is controlled by the `rejectMessage` property.
     */
    rejectToastSpec?: Partial<ToastSpec> | boolean;

    /**
     * Content to display on file rejection within a toast. Defaults to a list of rejected files
     * with reasons for rejection.
     */
    rejectToastMessage?: (rejectedFiles: FileRejection[]) => ReactNode;

    /** Mask the dropzone when dragging. Defaults to true. */
    maskOnDrag?: boolean;

    /** Mask the dropzone when disabled. Defaults to true. */
    maskOnDisabled?: boolean;

    /** Text to display in the default empty display. */
    emptyDisplayText?: ReactNode;

    /**
     *  Config for the browse button in the default empty display. Set false to omit browse
     *  button from default empty display.
     */
    emptyDisplayBrowseButton?: ButtonProps | boolean;
}

export class FileChooserModel extends HoistModel {
    @observable.ref
    files: File[] = [];

    @observable
    disabled: boolean;

    readonly accept: Record<string, string[]>;
    readonly maxCount: number;
    readonly maxFileSize: number;
    readonly minFileSize: number;
    readonly maskOnDrag: boolean;
    readonly maskOnDisabled: boolean;
    readonly emptyDisplayText: ReactNode;
    readonly emptyDisplayBrowseButton: ButtonProps;

    dropzoneRef = createObservableRef<DropzoneRef>();

    private readonly validateFilesAsync: (accepted: File[]) => Promise<File[]>;
    private readonly onFileAccepted: (accepted: File[]) => void;
    private readonly onFileRejected: (rejected: FileRejection[]) => void;
    private readonly rejectToastMessage: (rejectedFiles: FileRejection[]) => ReactNode;
    private readonly rejectToastSpec: Partial<ToastSpec>;

    constructor(params: FileChooserConf) {
        super();
        makeObservable(this);

        this.accept = this.getMimesByExt(params.accept);
        this.maxCount = params.maxCount;
        this.maxFileSize = params.maxFileSize;
        this.minFileSize = params.minFileSize;
        this.validateFilesAsync = params.validateFilesAsync;
        this.onFileAccepted = params.onFileAccepted;
        this.onFileRejected = params.onFileRejected;
        this.rejectToastMessage = withDefault(params.rejectToastMessage, this.defaultRejectMessage);
        this.rejectToastSpec = this.getRejectToastSpec(params.rejectToastSpec);
        this.maskOnDrag = withDefault(params.maskOnDrag, true);
        this.maskOnDisabled = withDefault(params.maskOnDisabled, true);
        this.emptyDisplayText = withDefault(params.emptyDisplayText, 'Drag and drop files here');
        this.emptyDisplayBrowseButton = this.getEmptyDisplayBrowseButtonProps(
            params.emptyDisplayBrowseButton
        );
    }

    /** Open the file browser programmatically. Typically used in a button's onClick callback.*/
    openFileBrowser() {
        this.dropzoneRef.current?.open();
    }

    /**
     * Add files to the selection. Files will be de-duplicated by name, with a newly added file
     * taking precedence over any existing file with the same name.
     */
    @action
    addFiles(files: Some<File>) {
        this.files = uniqBy(concat(files, this.files), 'name');
    }

    /** Remove a single file from the current selection. */
    @action
    removeFileByName(name: string) {
        this.files = filter(this.files, file => file.name !== name);
    }

    /** Clear the current selection. */
    @action
    clear() {
        this.files = [];
    }

    //------------------------
    // Event Handlers
    //------------------------
    async onDropAsync(accepted: File[], rejected: Partial<FileRejection[]> | any) {
        const {files, maxCount, rejectToastMessage, validateFilesAsync} = this,
            currFileCount = files.length,
            acceptCount = accepted.length,
            rejectCount = rejected.length;

        if (currFileCount + acceptCount + rejectCount > maxCount) {
            XH.warningToast(
                maxCount === 1
                    ? 'Only one file allowed for upload.'
                    : `File limit of ${maxCount} exceeded.`
            );
            return;
        }

        if (rejected.length && this.rejectToastSpec) {
            XH.toast({...this.rejectToastSpec, message: rejectToastMessage(rejected)});
        }

        if (isFunction(validateFilesAsync) && !isEmpty(accepted)) {
            accepted = await validateFilesAsync(accepted);
        }

        this.addFiles(accepted);

        this.onFileAccepted?.(accepted);
        this.onFileRejected?.(rejected);
    }

    //------------------------
    // Implementation
    //------------------------
    private getMimesByExt(extensions: Some<string>): Record<string, string[]> {
        if (isEmpty(extensions)) return null;

        extensions = castArray(extensions);
        return fromPairs(extensions.map(ext => [mime.getType(ext), [ext]]));
    }

    private defaultRejectMessage(rejections: FileRejection[]): ReactElement {
        // 1) Map rejected files to error messages
        const errorsByFile = fromPairs(
            map(rejections, ({file, errors}) => [file.handle.name, map(errors, 'message')])
        );

        // 2) List files with bulleted error messages
        const files = keys(errorsByFile),
            rejectItems = files.flatMap(file => {
                const messages = errorsByFile[file];
                return [
                    span(
                        em(file),
                        ` rejected for the following ${pluralize('reason', messages.length)}:`
                    ),
                    ul(map(messages, msg => li(msg)))
                ];
            });

        return vbox(rejectItems);
    }

    private getRejectToastSpec(params: Partial<ToastSpec> | boolean): Partial<ToastSpec> {
        if (params == false) return null;

        if (params == true) params = {};
        return {
            intent: 'danger',
            timeout: 10000,
            ...params
        };
    }

    private getEmptyDisplayBrowseButtonProps(params: Partial<ButtonProps> | boolean): ButtonProps {
        if (params == false) return null;
        if (params == true) params = {};
        return {
            text: 'Browse',
            intent: 'primary',
            outlined: true,
            disabled: this.disabled,
            onClick: () => this.openFileBrowser(),
            ...params
        };
    }
}
