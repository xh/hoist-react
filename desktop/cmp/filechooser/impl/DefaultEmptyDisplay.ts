import {a, div, placeholder} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {FileChooserModel} from '@xh/hoist/desktop/cmp/filechooser';
import {Icon} from '@xh/hoist/icon';
import {filesize} from 'filesize';
import {flatten, isEmpty, uniq, values} from 'lodash';
import './DefaultEmptyDisplay.scss';

export const defaultEmptyDisplay = hoistCmp.factory({
    model: uses(() => FileChooserModel),
    render({model}) {
        const {emptyDisplayText} = model;
        return placeholder(Icon.upload(), emptyDisplayText ?? emptyPrompt(), emptyHint());
    }
});

// Default prompt - drag-and-drop instruction paired with an inline link that opens the file
// browser, more compact than a standalone button.
const emptyPrompt = hoistCmp.factory({
    model: uses(() => FileChooserModel),
    render({model}) {
        return div(
            'Drag and drop files here, or ',
            a({
                className: 'xh-file-chooser__browse-link',
                item: 'click to browse',
                onClick: () => model.openFileBrowser()
            }),
            '.'
        );
    }
});

// Accepted-extension list collapses once it grows past HINT_EXTS_FULL: it then shows
// HINT_EXTS_COLLAPSED extensions plus a "+N more" suffix. The gap between the two ensures the
// suffix always stands in for 2+ extensions - never a "+1 more" longer than the entry it hides.
const HINT_EXTS_FULL = 4;
const HINT_EXTS_COLLAPSED = 3;

// Hint line - the configured `emptyDisplayHint`, or (by default) a terse summary of the configured
// constraints (accepted types, size and count limits). Omitted entirely when empty.
const emptyHint = hoistCmp.factory({
    model: uses(() => FileChooserModel),
    render({model}) {
        const {emptyDisplayHint, accept, maxFileSize, maxFiles} = model;

        let hint = emptyDisplayHint;
        if (hint === undefined) {
            const exts = accept ? uniq(flatten(values(accept))) : [],
                parts: string[] = [];

            if (!isEmpty(exts)) {
                let list: string;
                if (exts.length <= HINT_EXTS_FULL) {
                    list = exts.join(', ');
                } else {
                    const shown = exts.slice(0, HINT_EXTS_COLLAPSED);
                    list = `${shown.join(', ')} +${exts.length - shown.length} more`;
                }
                parts.push(`Accepts ${list}`);
            }
            if (maxFileSize) parts.push(`up to ${filesize(maxFileSize)} each`);
            if (maxFiles) parts.push(maxFiles === 1 ? 'one file only' : `up to ${maxFiles} files`);

            hint = isEmpty(parts) ? null : parts.join(' · ');
        }

        return div({className: 'xh-file-chooser__empty-hint', item: hint, omit: hint == null});
    }
});
