/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {hoistCmp} from '@xh/hoist/core';
import {Button} from '@xh/hoist/mobile/cmp/button';
import {hbox} from '@xh/hoist/cmp/layout';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {throwIf} from '@xh/hoist/utils/js';
import {castArray} from 'lodash';

import './ButtonGroup.scss';

/**
 * A segmented group of buttons. Should receive a list of Buttons as a children.
 */
export const [ButtonGroup, buttonGroup] = hoistCmp.withFactory({
    displayName: 'ButtonGroup',
    model: false, memo: false,
    className: 'xh-button-group',

    render(props) {
        const [layoutProps, {children, style, ...rest}] = splitLayoutProps(props),
            buttons = castArray(children);

        buttons.forEach(button => {
            throwIf(button && button.type !== Button, 'ButtonGroup child must be a Button.');
        });

        return hbox({
            items: buttons,
            style: {
                ...style,
                ...layoutProps
            },
            ...rest
        });
    }
});
ButtonGroup.propTypes = {
    style: PT.object
};