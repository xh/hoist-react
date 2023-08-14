import {PlainObject} from '@xh/hoist/core';

export function getTestId(props: PlainObject, name?: string): {testId: string} {
    return {testId: name ? `${props['data-testid']}-${name}` : props['data-testid']};
}
