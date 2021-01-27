/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from './Button';

/**
 * Convenience Button preconfigured for use as a trigger for opening the XH options dialog.
 *
 * Can be provided an onClick handler, otherwise will call default framework handler.
 */
export const [OptionsButton, optionsButton] = hoistCmp.withFactory({
    displayName: 'OptionsButton',
    model: false,

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
