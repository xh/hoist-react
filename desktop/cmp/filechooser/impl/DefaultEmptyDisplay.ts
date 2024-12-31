import {placeholder, vframe, vspacer} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {FileChooserModel} from '@xh/hoist/desktop/cmp/filechooser';

export const defaultEmptyDisplay = hoistCmp.factory({
    model: uses(() => FileChooserModel),
    render({model}) {
        const {emptyDisplayText, emptyDisplayBrowseButton} = model;
        return vframe(
            placeholder(
                emptyDisplayText,
                vspacer(),
                button({
                    ...emptyDisplayBrowseButton,
                    omit: !emptyDisplayBrowseButton
                })
            )
        );
    }
});
