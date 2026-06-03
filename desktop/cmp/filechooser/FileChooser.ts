/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
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
import {singleFileDisplay} from './impl/SingleFileDisplay';
import './FileChooser.scss';

export interface FileChooserProps extends HoistProps<FileChooserModel>, BoxProps {
    /**
     *  Content to display when one or more files are selected. In single-file mode (`maxFiles: 1`)
     *  the default is a compact card showing the selected file with options to replace or remove
     *  it; otherwise the default is a grid of file name / size with a per-row remove action.
     */
    fileDisplay?: Content;

    /**
     *  Content to display when no files are selected. Default is a prompt to drag-and-drop or
     *  click to browse. Setting to null will always show `fileDisplay`.
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

    render({model, emptyDisplay = defaultEmptyDisplay, fileDisplay, className, ...props}) {
        const {accept, disabled, maxFiles, maxFileSize, minFileSize, maskOnDrag, maskOnDisabled} =
                model,
            hasFiles = !isEmpty(model.files),
            // Surface is click-to-browse in the empty state and in single-file mode (click to
            // replace). Multi-file selections are not yet clickable (handled in a later phase).
            clickable = !hasFiles || maxFiles === 1,
            resolvedFileDisplay =
                fileDisplay ?? (maxFiles === 1 ? singleFileDisplay : defaultFileDisplay),
            dropzoneItem =
                !hasFiles && emptyDisplay != null
                    ? elementFromContent(emptyDisplay)
                    : elementFromContent(resolvedFileDisplay);

        return dropzone({
            ref: model.dropzoneRef,
            accept,
            disabled,
            maxFiles,
            multiple: !maxFiles || maxFiles > 1,
            noClick: !clickable,
            maxSize: maxFileSize,
            minSize: minFileSize,
            children: ({getRootProps, getInputProps, isDragActive}) => {
                return frame({
                    className: classNames(
                        className,
                        'xh-file-chooser__target',
                        isDragActive ? 'xh-file-chooser__target--active' : null,
                        !hasFiles ? 'xh-file-chooser__target--empty' : null,
                        clickable ? 'xh-file-chooser__target--clickable' : null
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
