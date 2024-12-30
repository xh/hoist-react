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
import {castArray, concat, filter, isEmpty, keys, fromPairs, map, uniqBy} from 'lodash';
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
     * Content to display on file reject within a danger toast.
     * Defaults to a list of rejected files with reasons for rejection.
     */
    rejectMessage?: (rejectedFiles: FileRejection[]) => ReactNode;

    /** Mask the dropzone when dragging. Defaults to true. */
    maskOnDrag?: boolean;

    /** Mask the dropzone when disabled. Defaults to true. */
    maskOnDisabled?: boolean;

    /**
     * Config to change file rejection toast behavior. Primarily used to change timeout,
     * intent, and icon. Toast message is controlled by the `rejectMessage` property.
     */
    rejectToastConf?: Partial<ToastSpec>;

    /** Text to display in the default empty display. */
    placeholderText?: ReactNode;

    /** Include a button to open the file browser in the empty placeholder. Defaults to true. */
    placeholderBrowseButton?: boolean;

    /** Config for the browse button in the default empty display. */
    browseButtonConfig?: ButtonProps;
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
    readonly placeholderText: ReactNode;
    readonly placeholderBrowseButton: boolean;
    readonly browseButtonConfig: Partial<ButtonProps>;

    dropzoneRef = createObservableRef<DropzoneRef>();

    private readonly rejectToastConfig: Partial<ToastSpec>;
    private readonly rejectMessage: (rejectedFiles: FileRejection[]) => ReactNode;

    constructor(params: FileChooserConf) {
        super();
        makeObservable(this);

        this.maxCount = params.maxCount;
        this.maxFileSize = params.maxFileSize;
        this.minFileSize = params.minFileSize;
        this.accept = this.getMimesByExt(params.accept);
        this.rejectMessage = withDefault(params.rejectMessage, this.defaultRejectMessage);
        this.maskOnDrag = withDefault(params.maskOnDrag, true);
        this.maskOnDisabled = withDefault(params.maskOnDisabled, true);
        this.placeholderText = withDefault(params.placeholderText, 'Drag and drop files here');
        this.placeholderBrowseButton = withDefault(params.placeholderBrowseButton, true);
        this.browseButtonConfig = {
            text: 'Browse',
            intent: 'primary',
            outlined: true,
            disabled: this.disabled,
            ...params.browseButtonConfig,
            onClick: () => this.openFileBrowser()
        };
        this.rejectToastConfig = {intent: 'danger', timeout: 10000, ...params.rejectToastConf};
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
    @action
    onDrop(accepted: File[], rejected: FileRejection[]) {
        const {files, maxCount, rejectMessage} = this,
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

        this.addFiles(accepted);

        if (rejectCount) {
            XH.toast({...this.rejectToastConfig, message: rejectMessage(rejected)});
        }
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
}
