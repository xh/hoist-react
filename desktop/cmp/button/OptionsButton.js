/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH, hoistComponent, elemFactory} from '@xh/hoist/core';
import {button, Button} from './Button';
import {Icon} from '@xh/hoist/icon';

/**
 * Convenience Button preconfigured for use as a trigger for opening the XH options dialog.
 *
 * Can be provided an onClick handler, otherwise will call default framework handler.
 */
export const OptionsButton = hoistComponent({
    displayName: 'OptionsButton',
    render(props) {
        return button({
            icon: Icon.gear(),
            title: 'Options',
            onClick: () => XH.showOptionsDialog(),
            ...props
        });
    }
});
OptionsButton.propTypes = {...Button.propTypes};

export const optionsButton = elemFactory(OptionsButton);
