/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {jsonInput, JsonInputProps} from '@xh/hoist/desktop/cmp/input';
import {fmtJson, timestampReplacer} from '@xh/hoist/format';

/**
 * Readonly `jsonInput` preconfigured for Admin Console stat / config displays - sized to fill its
 * container, without line numbers or a fullscreen button, and rendering timestamp-suffixed fields
 * as readable dates. Pass the data via `value` (any object) or `bind`, plus any additional
 * `jsonInput` props (e.g. `enableSearch`) to extend or override the defaults.
 */
export const adminJsonDisplay = hoistCmp.factory<JsonInputProps>({
    displayName: 'AdminJsonDisplay',
    render(props) {
        return jsonInput({
            readonly: true,
            flex: 1,
            width: '100%',
            height: '100%',
            showFullscreenButton: false,
            lineNumbers: false,
            formatter: v => fmtJson(v, {replacer: timestampReplacer()}),
            ...props
        });
    }
});
