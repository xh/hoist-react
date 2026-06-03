import {div, placeholder} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {FileChooserModel} from '@xh/hoist/desktop/cmp/filechooser';
import {Icon} from '@xh/hoist/icon';

// Persistent drop target shown alongside the file grid in multi-file mode, so users can continue
// adding (or dropping) files until any configured `maxFiles` limit is reached - at which point it
// renders a clear "limit reached" state (and the surrounding FileChooser disables interaction).
export const multiDropTarget = hoistCmp.factory({
    model: uses(() => FileChooserModel),
    render({model}) {
        const {maxFiles, files} = model,
            count = files.length;

        if (maxFiles != null && count >= maxFiles) {
            return placeholder(Icon.upload(), `Maximum of ${maxFiles} files reached`);
        }

        return placeholder(
            Icon.upload(),
            'Drop more files, or click to browse',
            maxFiles != null
                ? div({className: 'xh-file-chooser__target-count', item: `${count} of ${maxFiles}`})
                : null
        );
    }
});
