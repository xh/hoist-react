import {components} from 'react-select';

import {elemFactory} from '@xh/hoist/core';
import {fragment, span} from '@xh/hoist/cmp/layout';

export const valueContainer = elemFactory(components.ValueContainer);

export function SelectLeftIconFactory(icon) {
    return ({ children, ...props }) => fragment({
        items: [
            span({className: 'xh-select__control__left-icon', item: icon}),
            valueContainer({
                ...props,
                children
            })
        ]
    });
}