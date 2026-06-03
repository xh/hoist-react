import {div, placeholder} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {FileChooserModel} from '@xh/hoist/desktop/cmp/filechooser';
import {Icon} from '@xh/hoist/icon';
import {filesize} from 'filesize';
import {flatten, isEmpty, uniq, values} from 'lodash';
import './DefaultEmptyDisplay.scss';

const DEFAULT_PROMPT = 'Drag and drop files here, or click to browse.';

export const defaultEmptyDisplay = hoistCmp.factory({
    model: uses(() => FileChooserModel),
    render({model}) {
        const {emptyDisplayPrompt} = model;
        return placeholder(Icon.upload(), emptyDisplayPrompt ?? DEFAULT_PROMPT, emptyHint());
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
            // Only worth surfacing a multi-file cap; a single-file limit is clear from context.
            if (maxFiles > 1) parts.push(`up to ${maxFiles} files`);

            hint = isEmpty(parts) ? null : `(${parts.join(' · ')})`;
        }

        return div({className: 'xh-file-chooser__empty-hint', item: hint, omit: hint == null});
    }
});
