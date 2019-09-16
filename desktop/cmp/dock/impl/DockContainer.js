/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hbox} from '@xh/hoist/cmp/layout';

import classNames from 'classnames';
import {dockView} from './DockView';
import './Dock.scss';

/**
 * Desktop implementation of DockContainer.
 *
 * @private
 */

export function dockContainerImpl({model, className, compactHeaders, ...props}) {
    return hbox({
        className: classNames(className, `xh-dock-container--${model.direction}`),
        items: model.views.map(viewModel => {
            return dockView({
                key: viewModel.xhId,
                model: viewModel,
                compactHeaders
            });
        }),
        ...props
    });
}
