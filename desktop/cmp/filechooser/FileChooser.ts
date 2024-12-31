/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {frame, input} from '@xh/hoist/cmp/layout';
import {mask} from '@xh/hoist/cmp/mask';
import {BoxProps, Content, hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {dropzone} from '@xh/hoist/kit/react-dropzone';
import {elementFromContent, getLayoutProps} from '@xh/hoist/utils/react';
import {FileRejection} from 'react-dropzone';
import {FileChooserModel} from './FileChooserModel';
import {isEmpty} from 'lodash';
import classNames from 'classnames';
import {defaultEmptyDisplay} from './impl/DefaultEmptyDisplay';
import {defaultFileDisplay} from './impl/DefaultFileDisplay';

export interface FileChooserProps extends HoistProps<FileChooserModel>, BoxProps {
    /**
     *  Content to display when any files are uploaded.
     *  Default is a grid with columns for file name and size, and an action column to remove files.
     */
    fileDisplay?: Content;

    /**
     *  Content to display when no files are uploaded.
     *  Default is placeholder text with a browse button. Setting to null will always show
     *  fileDisplay.
     */
    emptyDisplay?: Content;
}

/**
 * A component to select one or more files from the local filesystem. Wraps the third-party
 * react-dropzone component to provide both drag-and-drop and click-to-browse file selection.
 * Expands upon this core functionality with a placeholder and grid displaying the list of
 * selected files and allowing the user to remove files from the selection.
 * The developer can fully customize the display by providing children to this component's
 * `items` prop.
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

    render({
        model,
        emptyDisplay = defaultEmptyDisplay,
        fileDisplay = defaultFileDisplay,
        className,
        ...props
    }) {
        const {accept, disabled, maxCount, maxFileSize, minFileSize, maskOnDrag, maskOnDisabled} =
                model,
            dropzoneItem =
                isEmpty(model.files) && emptyDisplay != null
                    ? elementFromContent(emptyDisplay)
                    : elementFromContent(fileDisplay);

        return dropzone({
            ref: model.dropzoneRef,
            accept,
            disabled,
            multiple: maxCount > 1,
            noClick: true,
            maxSize: maxFileSize,
            minSize: minFileSize,
            children: ({getRootProps, getInputProps, isDragActive}) => {
                return frame({
                    className: classNames(
                        className,
                        'xh-file-chooser__target',
                        isDragActive ? 'xh-file-chooser__target--active' : null,
                        isEmpty(model.files) ? 'xh-file-chooser__target--empty' : null
                    ),
                    items: [
                        dropzoneItem,
                        mask({
                            isDisplayed:
                                (isDragActive && maskOnDrag) || (disabled && maskOnDisabled)
                        }),
                        input({...getInputProps()})
                    ],
                    ...getRootProps(),
                    ...getLayoutProps(props)
                });
            },
            onDrop: (accepted: File[], rejected: FileRejection[]) =>
                model.onDropAsync(accepted, rejected)
        });
    }
});
