/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {hbox} from '@xh/hoist/cmp/layout';
import {Button} from '@xh/hoist/mobile/cmp/button';
import {throwIf} from '@xh/hoist/utils/js';
import {Children} from 'react';
import './ButtonGroup.scss';

/**
 * A segmented group of buttons. Should receive a list of Buttons as a children.
 */
export const [ButtonGroup, buttonGroup] = hoistCmp.withFactory({
    displayName: 'ButtonGroup',
    className: 'xh-button-group',
    model: false,

    render({children, className, ...rest}, ref) {
        const items = Children.toArray(children);

        items.forEach(button => {
            throwIf(button && button.type !== Button, 'ButtonGroup child must be a Button.');
        });

        return hbox({
            items,
            className,
            ...rest,
            ref
        });
    }
});