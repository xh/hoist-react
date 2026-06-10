/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {box, frame, hframe, input, vframe} from '@xh/hoist/cmp/layout';
import {mask} from '@xh/hoist/cmp/mask';
import {BoxProps, Content, hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {dropzone} from '@xh/hoist/kit/react-dropzone';
import {elementFromContent, getLayoutProps} from '@xh/hoist/utils/react';
import {FileRejection} from 'react-dropzone';
import {FileChooserModel} from './FileChooserModel';
import {fromPairs, isEmpty} from 'lodash';
import classNames from 'classnames';
import {defaultEmptyDisplay} from './impl/DefaultEmptyDisplay';
import {defaultFileDisplay} from './impl/DefaultFileDisplay';
import {multiDropTarget} from './impl/MultiDropTarget';
import {singleFileDisplay} from './impl/SingleFileDisplay';
import './FileChooser.scss';

export interface FileChooserProps extends HoistProps<FileChooserModel>, BoxProps {
    /**
     *  Content to display when one or more files are selected. In single-file mode (`maxFiles: 1`)
     *  the default is a compact card showing the selected file with options to replace or remove
     *  it; otherwise the default is a grid of file name / size with a per-row remove action. In
     *  multi-file mode this content is shown alongside the component's persistent drop target (see
     *  `dropTargetPlacement`), which is not itself customizable.
     */
    fileDisplay?: Content;

    /**
     *  Content to display when no files are selected. Default is a prompt to drag-and-drop or
     *  click to browse. Setting to null will always show `fileDisplay`.
     */
    emptyDisplay?: Content;

    /**
     *  Placement of the persistent drop target relative to the file grid in multi-file mode, once
     *  one or more files are selected. Default 'left' renders the target beside the grid; 'top'
     *  stacks it above (better for narrow/tall layouts); 'hidden' shows only the grid. Has no
     *  effect in single-file mode, where the selected file is itself the (replaceable) target.
     */
    dropTargetPlacement?: 'left' | 'top' | 'hidden';
}

/**
 * A component to select one or more files from the local filesystem. Wraps the third-party
 * react-dropzone component to provide both drag-and-drop and click-to-browse file selection.
 *
 * Out of the box it shows a drop / browse prompt when empty and, once files are selected, either a
 * compact card for the single file (when `maxFiles` is 1) or a grid of selected files paired with a
 * persistent drop target for adding more. The empty and selected displays can each be replaced via
 * the `emptyDisplay` and `fileDisplay` props (any Hoist `Content`), and the multi-file drop
 * target's placement is set via `dropTargetPlacement`.
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
        fileDisplay,
        dropTargetPlacement = 'left',
        className,
        ...props
    }) {
        const {accept, disabled, maxFiles, maxFileSize, minFileSize, maskOnDrag, maskOnDisabled} =
                model,
            hasFiles = !isEmpty(model.files),
            // Keep a persistent drop target beside the grid for multi-file selections, so users can
            // continue adding files (unless the app hid it).
            showSideTarget = hasFiles && maxFiles !== 1 && dropTargetPlacement !== 'hidden',
            atLimit = maxFiles != null && maxFiles !== 1 && model.files.length >= maxFiles,
            // Surface is click-to-browse when empty, in single-file mode (replace), or via the
            // persistent multi-file target - but never once a multi-file limit is reached.
            clickable = (!hasFiles || maxFiles === 1 || showSideTarget) && !atLimit,
            resolvedFileDisplay =
                fileDisplay ?? (maxFiles === 1 ? singleFileDisplay : defaultFileDisplay);

        return dropzone({
            ref: model.dropzoneRef,
            // react-dropzone wants a {type: [extensions]} map; extensions serve as their own keys.
            accept: accept ? fromPairs(accept.map(ext => [ext, [ext]])) : null,
            // Disable interaction (drag/click/drop) at the limit; the target shows a clear message.
            disabled: disabled || atLimit,
            maxFiles,
            multiple: !maxFiles || maxFiles > 1,
            noClick: !clickable,
            maxSize: maxFileSize,
            minSize: minFileSize,
            children: ({getRootProps, getInputProps, isDragActive}) => {
                const targetMask = mask({
                    isDisplayed: (isDragActive && maskOnDrag) || (disabled && maskOnDisabled)
                });

                // Multi-file: drop target rail beside the (inert) grid. `getRootProps` is applied
                // to the rail only, so the grid does not participate in drag / click.
                if (showSideTarget) {
                    const isTop = dropTargetPlacement === 'top',
                        container = isTop ? vframe : hframe;
                    return container({
                        className,
                        items: [
                            // `box` (flex: none) so the rail keeps a fixed size beside the grid;
                            // `frame` would grow and crowd it out.
                            box({
                                className: classNames(
                                    'xh-file-chooser__target',
                                    'xh-file-chooser__target--side',
                                    isTop
                                        ? 'xh-file-chooser__target--side-top'
                                        : 'xh-file-chooser__target--side-left',
                                    isDragActive ? 'xh-file-chooser__target--active' : null,
                                    clickable ? 'xh-file-chooser__target--clickable' : null,
                                    atLimit ? 'xh-file-chooser__target--disabled' : null
                                ),
                                width: isTop ? null : 200,
                                items: [multiDropTarget(), targetMask, input({...getInputProps()})],
                                ...getRootProps()
                            }),
                            frame({flex: 1, item: elementFromContent(resolvedFileDisplay)})
                        ],
                        ...getLayoutProps(props)
                    });
                }

                // Empty / single-file / hidden-target: the whole surface is the target.
                const dropzoneItem =
                    !hasFiles && emptyDisplay != null
                        ? elementFromContent(emptyDisplay)
                        : elementFromContent(resolvedFileDisplay);
                return frame({
                    className: classNames(
                        className,
                        'xh-file-chooser__target',
                        isDragActive ? 'xh-file-chooser__target--active' : null,
                        !hasFiles ? 'xh-file-chooser__target--empty' : null,
                        clickable ? 'xh-file-chooser__target--clickable' : null
                    ),
                    items: [dropzoneItem, targetMask, input({...getInputProps()})],
                    ...getRootProps(),
                    ...getLayoutProps(props)
                });
            },
            onDrop: (accepted: File[], rejected: FileRejection[]) =>
                model.onDrop(accepted, rejected)
        });
    }
});
