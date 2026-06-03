import {div, placeholder} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {FileChooserModel} from '@xh/hoist/desktop/cmp/filechooser';
import {Icon} from '@xh/hoist/icon';
import {filesize} from 'filesize';
import {MouseEvent} from 'react';
import './SingleFileDisplay.scss';

// Default display for single-file mode (`maxFiles === 1`) - a compact "resolved" card that mirrors
// the empty target but shows the selected file. The surface itself remains a click/drop target to
// replace the file, with an explicit action to clear it back to the empty state.
export const singleFileDisplay = hoistCmp.factory({
    model: uses(() => FileChooserModel),
    render({model}) {
        const file = model.files[0];
        if (!file) return null;

        return placeholder(
            Icon.fileIcon({filename: file.name}),
            div({className: 'xh-file-chooser__file-name', item: file.name}),
            div({
                className: 'xh-file-chooser__file-hint',
                item: `${filesize(file.size)} · drop or click to replace`
            }),
            button({
                text: 'Remove',
                icon: Icon.delete(),
                minimal: true,
                onClick: (e: MouseEvent) => {
                    // Don't let the click bubble to the drop target and open the file dialog.
                    e.stopPropagation();
                    model.clear();
                }
            })
        );
    }
});
