/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {div, hbox, input} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {dropzone} from '@xh/hoist/kit/react-dropzone';
import classNames from 'classnames';
import './FileChooser.scss';
import {FileChooserModel} from './FileChooserModel';
import {isFunction} from 'lodash';

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
export const [FileChooser, fileChooser] = hoistCmp.withFactory({
    displayName: 'FileChooser',
    model: uses(FileChooserModel),
    className: 'xh-file-chooser',

    render({model, ...props}, ref) {
        return hbox({
            ref,
            ...props,
            items: [
                dropzoneCmp(),
                grid({
                    flex: 1,
                    className: 'xh-file-chooser__grid',
                    omit: !model.showFileGrid
                })
            ]
        });
    }
});

const dropzoneCmp = hoistCmp.factory<FileChooserModel>({
    render({model}) {
        const {targetDisplay, rejectDisplay} = model;
        return dropzone({
            accept: model.accept,
            maxSize: model.maxSize,
            minSize: model.minSize,
            multiple: model.enableAddMulti,
            item: ({getRootProps, getInputProps, isDragActive}) => {
                return div({
                    ...getRootProps(),
                    items: [
                        isFunction(targetDisplay) ? targetDisplay(model) : targetDisplay,
                        div({
                            className: 'xh-file-chooser__reject-warning',
                            item: isFunction(rejectDisplay) ? rejectDisplay(model) : rejectDisplay
                        }),
                        input(getInputProps())
                    ],
                    className: classNames(
                        'xh-file-chooser__target',
                        isDragActive ? 'xh-file-chooser__target--active' : null,
                        model.showFileGrid ? 'xh-file-chooser__target--withGrid' : null
                    )
                });
            },
            onDrop: (accepted, rejected) => model.onDrop(accepted, rejected)
        });
    }
});
