/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {em, li, span, ul, vbox} from '@xh/hoist/cmp/layout';
import {HoistModel, Some, ToastSpec, XH} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {FileRejection} from '@xh/hoist/kit/react-dropzone';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {pluralize, withDefault} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {castArray, concat, filter, isEmpty, keys, fromPairs, map, uniqBy} from 'lodash';
import {ReactElement, ReactNode} from 'react';
import {DropzoneRef} from 'react-dropzone';

export interface FileChooserConfig {
    /** File extension(s) to accept, e.g. `['.doc', '.docx', '.pdf']` (MIME types not supported). */
    accept?: Some<string>;

    /** Maximum number of overall files that can be added. Defaults to null (no limit). */
    maxFiles?: number;

    /** Maximum accepted file size in bytes. Defaults to null (no limit). */
    maxFileSize?: number;

    /** Minimum accepted file size in bytes. Defaults to null (no limit). */
    minFileSize?: number;

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

    /**
     * Prompt shown in the default empty display. Defaults to a "drag and drop files here, or
     * click to browse" message with an inline link that opens the file browser. Provide a custom
     * string or element to replace it.
     */
    emptyDisplayPrompt?: ReactNode;

    /**
     * Secondary hint line shown below the prompt in the default empty display. Defaults to a
     * summary of the configured accepted file types and size/count limits (when any are set).
     * Pass null to suppress, or a custom string/element to replace it.
     */
    emptyDisplayHint?: ReactNode;
}

/**
 * Model managing file selection state for a {@link FileChooser} component.
 *
 * Tracks selected files and supports add/remove/clear operations. De-duplicates by filename, with
 * a newly added file taking precedence over any existing file of the same name.
 */
export class FileChooserModel extends HoistModel {
    @observable.ref
    files: File[] = [];

    @observable
    disabled: boolean;

    readonly accept: string[];
    readonly maxFiles: number;
    readonly maxFileSize: number;
    readonly minFileSize: number;
    readonly maskOnDrag: boolean;
    readonly maskOnDisabled: boolean;
    readonly emptyDisplayPrompt: ReactNode;
    readonly emptyDisplayHint: ReactNode;

    dropzoneRef = createObservableRef<DropzoneRef>();

    private readonly onFileAccepted: (accepted: File[]) => void;
    private readonly onFileRejected: (rejected: FileRejection[]) => void;
    private readonly rejectToastMessage: (rejectedFiles: FileRejection[]) => ReactNode;
    private readonly rejectToastSpec: Partial<ToastSpec>;

    constructor(config: FileChooserConfig) {
        super();
        makeObservable(this);

        this.accept = isEmpty(config.accept) ? null : castArray(config.accept);
        this.maxFiles = config.maxFiles;
        this.maxFileSize = config.maxFileSize;
        this.minFileSize = config.minFileSize;
        this.onFileAccepted = config.onFileAccepted;
        this.onFileRejected = config.onFileRejected;
        this.rejectToastMessage = withDefault(config.rejectToastMessage, this.defaultRejectMessage);
        this.rejectToastSpec = this.getRejectToastSpec(config.rejectToastSpec);
        this.maskOnDrag = withDefault(config.maskOnDrag, true);
        this.maskOnDisabled = withDefault(config.maskOnDisabled, true);
        this.emptyDisplayPrompt = config.emptyDisplayPrompt;
        this.emptyDisplayHint = config.emptyDisplayHint;
    }

    /** Open the file browser programmatically. Typically used in a button's onClick callback.*/
    openFileBrowser() {
        this.dropzoneRef.current?.open();
    }

    /**
     * Add files to the selection.
     *
     * Respects the `maxFiles` limit but does NOT enforce the `accept` / file-size constraints
     * (those are applied only on drop/browse) - use with care.
     */
    addFiles(files: Some<File>) {
        this.addFilesInternal(files);
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
    onDrop(accepted: File[], rejected: FileRejection[]) {
        const {maxFiles, rejectToastMessage} = this;

        if (!isEmpty(rejected)) {
            if (this.rejectToastSpec) {
                XH.toast({...this.rejectToastSpec, message: rejectToastMessage(rejected)});
            }
            this.onFileRejected?.(rejected);
        }

        if (!isEmpty(accepted)) {
            // In single-file mode, replace the current selection with the incoming file.
            if (maxFiles === 1 && accepted.length === 1) this.clear();

            if (this.addFilesInternal(accepted)) {
                this.onFileAccepted?.(accepted);
            }
        }
    }

    //------------------------
    // Implementation
    //------------------------
    // De-dupe by name, then enforce `maxFiles` on the result. Warns and no-ops if exceeded;
    // returns true if the selection was updated.
    @action
    private addFilesInternal(files: Some<File>): boolean {
        const {maxFiles} = this,
            deduped = uniqBy(concat(files, this.files), 'name');

        if (maxFiles != null && deduped.length > maxFiles) {
            XH.warningToast(
                maxFiles === 1
                    ? 'Only one file allowed for upload.'
                    : `File limit of ${maxFiles} exceeded.`
            );
            return false;
        }

        this.files = deduped;
        return true;
    }

    private defaultRejectMessage(rejections: FileRejection[]): ReactElement {
        // 1) Map rejected files to error messages
        const errorsByFile = fromPairs(
            map(rejections, ({file, errors}) => [file.name, map(errors, 'message')])
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
}
