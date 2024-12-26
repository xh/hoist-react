/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {box, input, placeholder, vframe, vspacer} from '@xh/hoist/cmp/layout';
import {BoxProps, hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {button} from '@xh/hoist/desktop/cmp/button';
import {dropzone} from '@xh/hoist/kit/react-dropzone';
import {FileRejection} from 'react-dropzone';
import {FileChooserModel} from './FileChooserModel';
import {Children} from 'react';
import {isEmpty, isFunction} from 'lodash';
import {mask} from '../mask';
import classNames from 'classnames';

export interface FileChooserProps extends HoistProps<FileChooserModel>, BoxProps {
    /** True to disable the file chooser. */
    disabled?: boolean;
}

/**
 * A component to select one or more files from the local filesystem. Wraps the third-party
 * react-dropzone component to provide both drag-and-drop and click-to-browse file selection.
 * Expands upon this core functionality with a placeholder and grid (enabled by default)
 * displaying the list of selected files and allowing the user to remove files from the selection.
 * Providing children components to the dropzone through the chooser's `items` props will render
 * those instead of the grid. The developer assumes complete control over all aspects of display
 * once children are provided.
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

    render({model, disabled, children, ...props}) {
        const {accept, maxSize, minSize, maskOnDrag, emptyDisplay = defaultEmptyDisplay} = model;

        let dropzoneItems = isEmpty(model.files)
            ? isFunction(emptyDisplay)
                ? emptyDisplay({disabled})
                : emptyDisplay
            : children
              ? Children.toArray(children)
              : grid({className: 'xh-file-chooser__target--active'});

        return dropzone({
            ref: model.dropzoneRef,
            noClick: true,
            accept,
            maxSize,
            minSize,
            disabled,
            children: ({getRootProps, getInputProps, isDragActive}) => {
                return box({
                    ...getRootProps(),
                    items: [
                        mask({isDisplayed: isDragActive, omit: !maskOnDrag}),
                        dropzoneItems,
                        input({...getInputProps()})
                    ],
                    ...props,
                    className: classNames(
                        'xh-file-chooser__target',
                        isDragActive ? 'xh-file-chooser__target--active' : null,
                        props.className
                    )
                });
            },
            onDrop: (accepted: File[], rejected: FileRejection[]) =>
                model.onDrop(accepted, rejected)
        });
    }
});

const defaultEmptyDisplay = hoistCmp.factory({
    model: uses(FileChooserModel),
    render({model, disabled}) {
        return vframe(
            placeholder(
                'Drag and drop files here',
                vspacer(),
                button({
                    text: 'Browse',
                    onClick: () => model.openFileBrowser(),
                    intent: 'primary',
                    outlined: true,
                    disabled
                })
            )
        );
    }
});
