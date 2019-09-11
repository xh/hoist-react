/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hbox} from '@xh/hoist/cmp/layout';
import {getClassName} from '@xh/hoist/utils/react';

import {dockView} from './DockView';
import './Dock.scss';

/**
 * Desktop implementation of DockContainer.
 *
 * @private
 */

export function dockContainerImpl({model, compactHeaders, ...props}) {
    const className = getClassName('xh-dock-container', props, `xh-dock-container--${model.direction}`);
    return hbox({
        className,
        items: model.views.map(viewModel => {
            return dockView({
                key: model.xhId,
                model: viewModel,
                compactHeaders
            });
        }),
        ...props
    });
}
