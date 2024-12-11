/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {div, hbox, input} from '@xh/hoist/cmp/layout';
import {BoxProps, hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {dropzone} from '@xh/hoist/kit/react-dropzone';
import classNames from 'classnames';
import './FileChooser.scss';
import {FileRejection} from 'react-dropzone';
import {FileChooserModel} from './FileChooserModel';

export interface FileChooserProps extends HoistProps<FileChooserModel>, BoxProps {
    /** True to disable the file chooser. */
    disabled?: boolean;
}

/**
 * A component to select one or more files from the local filesystem. Wraps the third-party
 * react-dropzone component to provide both drag-and-drop and click-to-browse file selection.
 * Expands upon this core functionality with an optional grid (enabled by default) displaying
 * the list of selected files and allowing the user to remove files from the selection.
 *
 * This component should be provided with a FileChooserModel instance, as the model holds an
 * observable collection of File objects and provides a public API to manipulate the selection.
 *
 * The application is responsible for processing the selected files (e.g. by uploading them to a
 * server) and clearing the selection when complete.
 *
 * @see FileChooserModel
 */
export const [FileChooser, fileChooser] = hoistCmp.withFactory<FileChooserProps>({
    displayName: 'FileChooser',
    model: uses(FileChooserModel),
    className: 'xh-file-chooser',

    render({model, disabled, ...props}, ref) {
        const {accept, maxSize, minSize, showFileGrid, noClick, targetDisplay, rejectDisplay} =
            model;
        return hbox({
            ref,
            ...props,
            items: [
                dropzone({
                    ref: model.dropzoneRef,
                    accept,
                    maxSize,
                    minSize,
                    noClick,
                    disabled,
                    children: ({getRootProps, getInputProps, isDragActive}) =>
                        div({
                            ...getRootProps(),
                            items: [targetDisplay, rejectDisplay, input({...getInputProps()})],
                            className: classNames(
                                'xh-file-chooser__target',
                                isDragActive ? 'xh-file-chooser__target--active' : null,
                                showFileGrid ? 'xh-file-chooser__target--withGrid' : null,
                                !noClick && !disabled ? 'xh-file-chooser__target--pointer' : null,
                                disabled ? 'xh-file-chooser__target--disabled' : null
                            )
                        }),
                    onDragEnter: e => model.onDragEnter(e),
                    onDragLeave: e => model.onDragLeave(e),
                    onDrop: (accepted: File[], rejected: FileRejection[]) =>
                        model.onDrop(accepted, rejected)
                }),
                grid({
                    flex: 1,
                    className: 'xh-file-chooser__grid',
                    omit: !showFileGrid
                })
            ]
        });
    }
});
